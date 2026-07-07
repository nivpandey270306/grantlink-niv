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
  execSync('cargo build --target wasm32-unknown-unknown --release', { stdio: 'inherit' });
  console.log('Build complete.\n');

  // Paths to built WASM files
  const registryWasm = 'target_build/wasm32-unknown-unknown/release/grant_registry.wasm';
  const applicationWasm = 'target_build/wasm32-unknown-unknown/release/grant_application.wasm';
  const escrowWasm = 'target_build/wasm32-unknown-unknown/release/grant_escrow.wasm';

  // 2. Fetch admin public key (Source key)
  console.log('Step 2: Resolving source keys address...');
  const adminAddress = execSync(`stellar keys address ${SOURCE_ACCOUNT}`).toString().trim();
  console.log(`Admin address resolved: ${adminAddress}\n`);

  // 3. Deploy GrantRegistry
  console.log('Step 3: Deploying GrantRegistry contract to Testnet...');
  const deployRegistryCmd = `stellar contract deploy --wasm ${registryWasm} --source ${SOURCE_ACCOUNT} --network ${NETWORK} -- --admin ${adminAddress}`;
  const registryAddress = execSync(deployRegistryCmd).toString().trim();
  console.log(`GrantRegistry deployed at address: ${registryAddress}\n`);

  // 4. Deploy GrantApplication
  console.log('Step 4: Deploying GrantApplication contract to Testnet...');
  const deployApplicationCmd = `stellar contract deploy --wasm ${applicationWasm} --source ${SOURCE_ACCOUNT} --network ${NETWORK} -- --admin ${adminAddress} --registry_contract ${registryAddress}`;
  const applicationAddress = execSync(deployApplicationCmd).toString().trim();
  console.log(`GrantApplication deployed at address: ${applicationAddress}\n`);

  // 5. Deploy GrantEscrow
  console.log('Step 5: Deploying GrantEscrow contract to Testnet...');
  const deployEscrowCmd = `stellar contract deploy --wasm ${escrowWasm} --source ${SOURCE_ACCOUNT} --network ${NETWORK} -- --admin ${adminAddress} --registry_contract ${registryAddress} --application_contract ${applicationAddress}`;
  const escrowAddress = execSync(deployEscrowCmd).toString().trim();
  console.log(`GrantEscrow deployed at address: ${escrowAddress}\n`);

  // 6. Write environment configuration to frontend .env
  console.log('Step 6: Linking deployed contract addresses to frontend...');
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
  console.log('----------------------------------------------------');

} catch (error) {
  console.error('Deployment execution failed:', error.message);
  process.exit(1);
}
