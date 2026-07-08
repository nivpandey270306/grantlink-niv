#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, Address, Env, String, Vec,
};

// No dependencies needed from workspace
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Grant {
    pub id: u32,
    pub owner: Address,
    pub title: String,
    pub description: String,
    pub category: String,
    pub amount: i128,
    pub deadline: u64,
    pub milestone_count: u32,
    pub status: u32,
}

#[soroban_sdk::contractclient(name = "GrantRegistryContractClient")]
pub trait GrantRegistryInterface {
    fn get_grant(env: Env, id: u32) -> Option<Grant>;
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    EscrowNotFound = 1,
    Unauthorized = 2,
    InvalidStatus = 3,
    InvalidMilestone = 4,
    AlreadyInitialized = 5,
    InsufficientBalance = 6,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct EscrowState {
    pub grant_id: u32,
    pub recipient: Address,
    pub milestone_amounts: Vec<i128>,
    pub milestone_released: Vec<bool>,
    pub funds_deposited: i128,
    pub token: Option<Address>, // Stellar Asset Contract Address
    pub status: u32,            // 0 = Initialized, 1 = Funded, 2 = Refunded, 3 = Completed
}

#[contracttype]
pub enum DataKey {
    Admin,
    RegistryContract,
    ApplicationContract,
    Escrow(u32),
}

#[contract]
pub struct GrantEscrowContract;

#[contractimpl]
impl GrantEscrowContract {
    pub fn __constructor(
        env: Env,
        admin: Address,
        registry_contract: Address,
        application_contract: Address,
    ) {
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::RegistryContract, &registry_contract);
        env.storage()
            .instance()
            .set(&DataKey::ApplicationContract, &application_contract);
    }

    /// Admin-only: update the trusted application contract address.
    /// Used during deployment to resolve circular contract dependency.
    pub fn set_application_contract(env: Env, application_contract: Address) {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("Admin not set");
        admin.require_auth();
        env.storage()
            .instance()
            .set(&DataKey::ApplicationContract, &application_contract);
    }

    pub fn initialize_escrow(
        env: Env,
        grant_id: u32,
        recipient: Address,
        milestone_amounts: Vec<i128>,
    ) -> Result<(), Error> {
        let app_contract: Address = env
            .storage()
            .instance()
            .get(&DataKey::ApplicationContract)
            .ok_or(Error::Unauthorized)?;

        app_contract.require_auth();

        if env.storage().persistent().has(&DataKey::Escrow(grant_id)) {
            return Err(Error::AlreadyInitialized);
        }

        let mut milestone_released = Vec::new(&env);
        for _ in 0..milestone_amounts.len() {
            milestone_released.push_back(false);
        }

        let escrow = EscrowState {
            grant_id,
            recipient,
            milestone_amounts,
            milestone_released,
            funds_deposited: 0,
            token: None,
            status: 0,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Escrow(grant_id), &escrow);
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::Escrow(grant_id), 17280, 518400);

        Ok(())
    }

    pub fn deposit_funds(
        env: Env,
        grant_id: u32,
        token: Address,
        funder: Address,
    ) -> Result<(), Error> {
        funder.require_auth();

        let mut escrow: EscrowState = env
            .storage()
            .persistent()
            .get(&DataKey::Escrow(grant_id))
            .ok_or(Error::EscrowNotFound)?;

        if escrow.status != 0 {
            return Err(Error::InvalidStatus);
        }

        let mut total_amount: i128 = 0;
        for amount in escrow.milestone_amounts.iter() {
            total_amount += amount;
        }

        // Call the SAC Token contract to transfer funds to this escrow contract address
        let token_client = soroban_sdk::token::Client::new(&env, &token);
        token_client.transfer(&funder, &env.current_contract_address(), &total_amount);

        escrow.funds_deposited = total_amount;
        escrow.token = Some(token);
        escrow.status = 1; // Funded

        env.storage()
            .persistent()
            .set(&DataKey::Escrow(grant_id), &escrow);

        // Emit Event
        env.events()
            .publish((symbol_short!("deposit"), funder, grant_id), total_amount);

        Ok(())
    }

    pub fn release_milestone(env: Env, grant_id: u32, milestone_idx: u32) -> Result<(), Error> {
        let mut escrow: EscrowState = env
            .storage()
            .persistent()
            .get(&DataKey::Escrow(grant_id))
            .ok_or(Error::EscrowNotFound)?;

        if escrow.status != 1 {
            return Err(Error::InvalidStatus);
        }

        if milestone_idx >= escrow.milestone_amounts.len() {
            return Err(Error::InvalidMilestone);
        }

        let is_released = escrow.milestone_released.get(milestone_idx).unwrap_or(true);
        if is_released {
            return Err(Error::InvalidMilestone);
        }

        // Fetch registry and verify owner auth
        let registry_addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::RegistryContract)
            .ok_or(Error::Unauthorized)?;

        let registry_client = GrantRegistryContractClient::new(&env, &registry_addr);
        let grant_opt = registry_client.get_grant(&grant_id);

        let grant = grant_opt.ok_or(Error::Unauthorized)?;
        grant.owner.require_auth();

        let amount_to_release = escrow.milestone_amounts.get(milestone_idx).unwrap();
        let token_addr = escrow.token.as_ref().ok_or(Error::InvalidStatus)?;
        let token_client = soroban_sdk::token::Client::new(&env, token_addr);

        token_client.transfer(
            &env.current_contract_address(),
            &escrow.recipient,
            &amount_to_release,
        );

        escrow.milestone_released.set(milestone_idx, true);

        // Check if all milestones released
        let mut all_completed = true;
        for released in escrow.milestone_released.iter() {
            if !released {
                all_completed = false;
                break;
            }
        }

        if all_completed {
            escrow.status = 3; // Completed
        }

        env.storage()
            .persistent()
            .set(&DataKey::Escrow(grant_id), &escrow);

        // Emit Event
        env.events().publish(
            (
                symbol_short!("released"),
                escrow.recipient.clone(),
                grant_id,
                milestone_idx,
            ),
            amount_to_release,
        );

        Ok(())
    }

    pub fn refund_grant(env: Env, grant_id: u32) -> Result<(), Error> {
        let mut escrow: EscrowState = env
            .storage()
            .persistent()
            .get(&DataKey::Escrow(grant_id))
            .ok_or(Error::EscrowNotFound)?;

        if escrow.status != 1 {
            return Err(Error::InvalidStatus);
        }

        // Fetch registry and verify owner auth
        let registry_addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::RegistryContract)
            .ok_or(Error::Unauthorized)?;

        let registry_client = GrantRegistryContractClient::new(&env, &registry_addr);
        let grant = registry_client
            .get_grant(&grant_id)
            .ok_or(Error::Unauthorized)?;
        grant.owner.require_auth();

        // Calculate remaining funds
        let mut remaining_amount: i128 = 0;
        for i in 0..escrow.milestone_amounts.len() {
            if !escrow.milestone_released.get(i).unwrap_or(true) {
                remaining_amount += escrow.milestone_amounts.get(i).unwrap();
            }
        }

        if remaining_amount > 0 {
            let token_addr = escrow.token.as_ref().ok_or(Error::InvalidStatus)?;
            let token_client = soroban_sdk::token::Client::new(&env, token_addr);
            token_client.transfer(
                &env.current_contract_address(),
                &grant.owner,
                &remaining_amount,
            );
        }

        escrow.status = 2; // Refunded
        env.storage()
            .persistent()
            .set(&DataKey::Escrow(grant_id), &escrow);

        // Emit Event
        env.events().publish(
            (symbol_short!("refunded"), grant.owner, grant_id),
            remaining_amount,
        );

        Ok(())
    }

    pub fn withdraw_remaining(env: Env, grant_id: u32) -> Result<(), Error> {
        Self::refund_grant(env, grant_id)
    }

    pub fn get_escrow(env: Env, grant_id: u32) -> Option<EscrowState> {
        env.storage().persistent().get(&DataKey::Escrow(grant_id))
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use grant_registry::GrantRegistryContract;
    use soroban_sdk::{testutils::Address as _, Env};

    #[test]
    fn deposit_funds_test() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let owner = Address::generate(&env);
        let recipient = Address::generate(&env);

        let registry_id = env.register(GrantRegistryContract, (admin.clone(),));
        let escrow_id = env.register(
            GrantEscrowContract,
            (admin.clone(), registry_id.clone(), admin.clone()),
        );
        let escrow_client = GrantEscrowContractClient::new(&env, &escrow_id);

        let milestone_amounts: Vec<i128> = Vec::from_array(&env, [3000i128, 4000i128, 3000i128]);
        escrow_client.initialize_escrow(&1, &recipient, &milestone_amounts);

        let token_admin = Address::generate(&env);
        let token_addr = env.register_stellar_asset_contract(token_admin.clone());
        let token_admin_client = soroban_sdk::token::StellarAssetClient::new(&env, &token_addr);
        let token_client = soroban_sdk::token::Client::new(&env, &token_addr);

        token_admin_client.mint(&owner, &10000i128);
        escrow_client.deposit_funds(&1, &token_addr, &owner);

        assert_eq!(token_client.balance(&owner), 0i128);
        assert_eq!(token_client.balance(&escrow_id), 10000i128);

        let escrow_state = escrow_client.get_escrow(&1).unwrap();
        assert_eq!(escrow_state.status, 1);
    }

    #[test]
    fn release_milestone_test() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let owner = Address::generate(&env);
        let recipient = Address::generate(&env);

        let registry_id = env.register(GrantRegistryContract, (admin.clone(),));
        let escrow_id = env.register(
            GrantEscrowContract,
            (admin.clone(), registry_id.clone(), admin.clone()),
        );
        let escrow_client = GrantEscrowContractClient::new(&env, &escrow_id);

        let milestone_amounts: Vec<i128> = Vec::from_array(&env, [3000i128, 4000i128, 3000i128]);
        escrow_client.initialize_escrow(&1, &recipient, &milestone_amounts);

        let token_admin = Address::generate(&env);
        let token_addr = env.register_stellar_asset_contract(token_admin.clone());
        let token_admin_client = soroban_sdk::token::StellarAssetClient::new(&env, &token_addr);
        let token_client = soroban_sdk::token::Client::new(&env, &token_addr);

        token_admin_client.mint(&owner, &10000i128);
        escrow_client.deposit_funds(&1, &token_addr, &owner);

        // Create grant on registry so release_milestone can retrieve it
        let registry_client = grant_registry::GrantRegistryContractClient::new(&env, &registry_id);
        let title = String::from_str(&env, "Agri Fund");
        let desc = String::from_str(&env, "Agri Desc");
        let cat = String::from_str(&env, "Agriculture");
        registry_client.create_grant(&owner, &title, &desc, &cat, &10000i128, &1000u64, &3u32);

        escrow_client.release_milestone(&1, &0);
        assert_eq!(token_client.balance(&recipient), 3000i128);
        assert_eq!(token_client.balance(&escrow_id), 7000i128);
    }

    #[test]
    fn refund_grant_test() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let owner = Address::generate(&env);
        let recipient = Address::generate(&env);

        let registry_id = env.register(GrantRegistryContract, (admin.clone(),));
        let escrow_id = env.register(
            GrantEscrowContract,
            (admin.clone(), registry_id.clone(), admin.clone()),
        );
        let escrow_client = GrantEscrowContractClient::new(&env, &escrow_id);

        let milestone_amounts: Vec<i128> = Vec::from_array(&env, [3000i128, 4000i128, 3000i128]);
        escrow_client.initialize_escrow(&1, &recipient, &milestone_amounts);

        let token_admin = Address::generate(&env);
        let token_addr = env.register_stellar_asset_contract(token_admin.clone());
        let token_admin_client = soroban_sdk::token::StellarAssetClient::new(&env, &token_addr);
        let token_client = soroban_sdk::token::Client::new(&env, &token_addr);

        token_admin_client.mint(&owner, &10000i128);
        escrow_client.deposit_funds(&1, &token_addr, &owner);

        let registry_client = grant_registry::GrantRegistryContractClient::new(&env, &registry_id);
        let title = String::from_str(&env, "Agri Fund");
        let desc = String::from_str(&env, "Agri Desc");
        let cat = String::from_str(&env, "Agriculture");
        registry_client.create_grant(&owner, &title, &desc, &cat, &10000i128, &1000u64, &3u32);

        escrow_client.refund_grant(&1);
        assert_eq!(token_client.balance(&owner), 10000i128);
        assert_eq!(token_client.balance(&escrow_id), 0i128);

        let escrow_state = escrow_client.get_escrow(&1).unwrap();
        assert_eq!(escrow_state.status, 2); // Refunded
    }

    #[test]
    fn insufficient_funds_test() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let owner = Address::generate(&env);
        let recipient = Address::generate(&env);

        let registry_id = env.register(GrantRegistryContract, (admin.clone(),));
        let escrow_id = env.register(
            GrantEscrowContract,
            (admin.clone(), registry_id.clone(), admin.clone()),
        );
        let escrow_client = GrantEscrowContractClient::new(&env, &escrow_id);

        let milestone_amounts: Vec<i128> = Vec::from_array(&env, [3000i128, 4000i128, 3000i128]);
        escrow_client.initialize_escrow(&1, &recipient, &milestone_amounts);

        let token_admin = Address::generate(&env);
        let token_addr = env.register_stellar_asset_contract(token_admin.clone());
        let token_admin_client = soroban_sdk::token::StellarAssetClient::new(&env, &token_addr);

        // Owner only has 5000 tokens, but deposit needs 10000.
        token_admin_client.mint(&owner, &5000i128);

        let res = escrow_client.try_deposit_funds(&1, &token_addr, &owner);
        assert!(res.is_err());
    }
}
