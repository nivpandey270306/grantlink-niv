import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Load keys or use default testnet account
const SOURCE_ACCOUNT = 'alice';
const NETWORK = 'testnet';

console.log('----------------------------------------------------');
console.log('GrantLink On-Chain Deployment Script');
console.log('----------------------------------------------------');

try {
  // 1. Build optimized WASM binaries
  console.log('Step 1: Building optimized contract binaries...');
  execSync('stellar contract build', { stdio: 'inherit' });
  console.log('Build complete.\n');

  // Paths to built WASM files
  const registryWasm = 'target/wasm32v1-none/release/grant_registry.wasm';
  const applicationWasm = 'target/wasm32v1-none/release/grant_application.wasm';
  const escrowWasm = 'target/wasm32v1-none/release/grant_escrow.wasm';

  // 2. Fetch admin public key (Source key)
  console.log('Step 2: Resolving source keys address...');
  const adminAddress = execSync(`stellar keys address ${SOURCE_ACCOUNT}`).toString().trim();
  console.log(`Admin address resolved: ${adminAddress}\n`);

  // 3. Deploy GrantRegistry
  console.log('Step 3: Deploying GrantRegistry contract to Testnet...');
  const deployRegistryCmd = `stellar contract deploy --wasm ${registryWasm} --source ${SOURCE_ACCOUNT} --network ${NETWORK} -- --admin ${adminAddress}`;
  const registryAddress = execSync(deployRegistryCmd).toString().trim();
  console.log(`GrantRegistry deployed at address: ${registryAddress}\n`);

  // 4. Deploy GrantEscrow FIRST (with admin as temporary application_contract placeholder)
  //    This resolves the circular dependency:
  //    GrantApplication needs escrow address at construction.
  //    GrantEscrow needs application address at construction.
  //    Pattern: deploy escrow with admin placeholder → deploy application with real escrow →
  //             call escrow.set_application_contract(applicationAddress) as admin.
  console.log('Step 4: Deploying GrantEscrow contract (phase 1 - with admin as app placeholder)...');
  const deployEscrowCmd = `stellar contract deploy --wasm ${escrowWasm} --source ${SOURCE_ACCOUNT} --network ${NETWORK} -- --admin ${adminAddress} --registry_contract ${registryAddress} --application_contract ${adminAddress}`;
  const escrowAddress = execSync(deployEscrowCmd).toString().trim();
  console.log(`GrantEscrow deployed at address: ${escrowAddress}\n`);

  // 5. Deploy GrantApplication with real escrow address
  console.log('Step 5: Deploying GrantApplication contract with registered escrow address...');
  const deployApplicationCmd = `stellar contract deploy --wasm ${applicationWasm} --source ${SOURCE_ACCOUNT} --network ${NETWORK} -- --admin ${adminAddress} --registry_contract ${registryAddress} --escrow_contract ${escrowAddress}`;
  const applicationAddress = execSync(deployApplicationCmd).toString().trim();
  console.log(`GrantApplication deployed at address: ${applicationAddress}\n`);

  // 6. Update GrantEscrow to point to the real GrantApplication contract
  console.log('Step 6: Linking GrantEscrow to real GrantApplication contract...');
  const updateEscrowCmd = `stellar contract invoke --id ${escrowAddress} --source ${SOURCE_ACCOUNT} --network ${NETWORK} -- set_application_contract --application_contract ${applicationAddress}`;
  execSync(updateEscrowCmd, { stdio: 'inherit' });
  console.log('GrantEscrow application_contract updated.\n');

  // 7. Write environment configuration to frontend .env
  console.log('Step 7: Linking deployed contract addresses to frontend...');
  const envContent = `VITE_RPC_URL="https://soroban-testnet.stellar.org"
VITE_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
VITE_GRANT_REGISTRY_CONTRACT="${registryAddress}"
VITE_GRANT_APPLICATION_CONTRACT="${applicationAddress}"
VITE_GRANT_ESCROW_CONTRACT="${escrowAddress}"
VITE_FREIGHTER_ENABLED="true"
`;

  const envPath = path.resolve('../frontend/.env');
  fs.writeFileSync(envPath, envContent);
  console.log(`Successfully wrote contract configuration to: ${envPath}\n`);
  
  console.log('----------------------------------------------------');
  console.log('DEPLOYMENT COMPLETE');
  console.log(`  Registry:    ${registryAddress}`);
  console.log(`  Application: ${applicationAddress}`);
  console.log(`  Escrow:      ${escrowAddress}`);
  console.log('----------------------------------------------------');

} catch (error) {
  console.error('Deployment execution failed:', error.message);
  process.exit(1);
}
