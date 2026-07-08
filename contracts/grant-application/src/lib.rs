#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, contracterror, Address, Env, String, Vec, symbol_short};

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
    ApplicationNotFound = 1,
    Unauthorized = 2,
    InvalidStatus = 3,
    GrantNotFound = 4,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Application {
    pub id: u32,
    pub applicant: Address,
    pub grant_id: u32,
    pub name: String,
    pub project_title: String,
    pub proposal: String,
    pub requested_amount: i128,
    pub status: u32, // 0 = Pending, 1 = Approved, 2 = Rejected
}

#[contracttype]
pub enum DataKey {
    Admin,
    RegistryContract,
    EscrowContract,
    NextAppId,
    Application(u32),
}

#[contract]
pub struct GrantApplicationContract;

#[contractimpl]
impl GrantApplicationContract {
    pub fn __constructor(env: Env, admin: Address, registry_contract: Address, escrow_contract: Address) {
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::RegistryContract, &registry_contract);
        env.storage().instance().set(&DataKey::EscrowContract, &escrow_contract);
        env.storage().instance().set(&DataKey::NextAppId, &1u32);
    }

    /// Returns the registered escrow contract address.
    pub fn get_escrow_contract(env: Env) -> Option<Address> {
        env.storage().instance().get(&DataKey::EscrowContract)
    }

    pub fn submit_application(
        env: Env,
        applicant: Address,
        grant_id: u32,
        name: String,
        project_title: String,
        proposal: String,
        requested_amount: i128,
    ) -> Result<u32, Error> {
        applicant.require_auth();

        // Check if grant exists in Registry
        let registry_addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::RegistryContract)
            .ok_or(Error::Unauthorized)?;

        let registry_client = GrantRegistryContractClient::new(&env, &registry_addr);
        let _grant = registry_client.get_grant(&grant_id).ok_or(Error::GrantNotFound)?;

        let mut next_id: u32 = env.storage().instance().get(&DataKey::NextAppId).unwrap_or(1);

        let app = Application {
            id: next_id,
            applicant: applicant.clone(),
            grant_id,
            name,
            project_title,
            proposal,
            requested_amount,
            status: 0, // Pending
        };

        env.storage().persistent().set(&DataKey::Application(next_id), &app);
        env.storage().persistent().extend_ttl(&DataKey::Application(next_id), 17280, 518400);

        next_id += 1;
        env.storage().instance().set(&DataKey::NextAppId, &next_id);

        // Emit Event
        env.events().publish(
            (symbol_short!("submit"), applicant, grant_id),
            next_id - 1,
        );

        Ok(next_id - 1)
    }

    pub fn approve_application(
        env: Env,
        app_id: u32,
        milestone_amounts: Vec<i128>,
    ) -> Result<(), Error> {
        let mut app: Application = env
            .storage()
            .persistent()
            .get(&DataKey::Application(app_id))
            .ok_or(Error::ApplicationNotFound)?;

        if app.status != 0 {
            return Err(Error::InvalidStatus);
        }

        // Fetch registry and verify owner auth
        let registry_addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::RegistryContract)
            .ok_or(Error::Unauthorized)?;

        let registry_client = GrantRegistryContractClient::new(&env, &registry_addr);
        let grant = registry_client.get_grant(&app.grant_id).ok_or(Error::GrantNotFound)?;
        grant.owner.require_auth();

        // Resolve escrow contract from trusted storage — NOT from caller input
        let escrow_contract: Address = env
            .storage()
            .instance()
            .get(&DataKey::EscrowContract)
            .ok_or(Error::Unauthorized)?;

        // Mark application as approved
        app.status = 1; // Approved
        env.storage().persistent().set(&DataKey::Application(app_id), &app);
        env.storage().persistent().extend_ttl(&DataKey::Application(app_id), 17280, 518400);

        // Cross-Contract Call: Trigger Escrow Contract Initialization (trusted address from storage)
        use soroban_sdk::IntoVal;
        let mut args = soroban_sdk::Vec::new(&env);
        args.push_back(app.grant_id.into_val(&env));
        args.push_back(app.applicant.clone().into_val(&env));
        args.push_back(milestone_amounts.into_val(&env));
        let _: () = env.invoke_contract(&escrow_contract, &soroban_sdk::Symbol::new(&env, "initialize_escrow"), args);

        // Emit Event
        env.events().publish(
            (symbol_short!("approved"), app.applicant.clone(), app.grant_id),
            app_id,
        );

        Ok(())
    }

    pub fn reject_application(env: Env, app_id: u32) -> Result<(), Error> {
        let mut app: Application = env
            .storage()
            .persistent()
            .get(&DataKey::Application(app_id))
            .ok_or(Error::ApplicationNotFound)?;

        if app.status != 0 {
            return Err(Error::InvalidStatus);
        }

        // Fetch registry and verify owner auth
        let registry_addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::RegistryContract)
            .ok_or(Error::Unauthorized)?;

        let registry_client = GrantRegistryContractClient::new(&env, &registry_addr);
        let grant = registry_client.get_grant(&app.grant_id).ok_or(Error::GrantNotFound)?;
        grant.owner.require_auth();

        app.status = 2; // Rejected
        env.storage().persistent().set(&DataKey::Application(app_id), &app);

        // Emit Event
        env.events().publish(
            (symbol_short!("rejected"), app.applicant.clone(), app.grant_id),
            app_id,
        );

        Ok(())
    }

    pub fn get_application(env: Env, app_id: u32) -> Option<Application> {
        env.storage().persistent().get(&DataKey::Application(app_id))
    }

    pub fn list_applications(env: Env) -> Vec<Application> {
        let next_id: u32 = env.storage().instance().get(&DataKey::NextAppId).unwrap_or(1);
        let mut apps = Vec::new(&env);
        for id in 1..next_id {
            if let Some(app) = env.storage().persistent().get::<DataKey, Application>(&DataKey::Application(id)) {
                apps.push_back(app);
            }
        }
        apps
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env};
    use grant_registry::GrantRegistryContract;
    use grant_escrow::GrantEscrowContract;

    #[test]
    fn submit_application_test() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let owner = Address::generate(&env);
        let applicant = Address::generate(&env);

        let registry_id = env.register(GrantRegistryContract, (admin.clone(),));
        let registry_client = grant_registry::GrantRegistryContractClient::new(&env, &registry_id);

        let title = String::from_str(&env, "Agri Fund");
        let desc = String::from_str(&env, "Agri Desc");
        let cat = String::from_str(&env, "Agriculture");
        let grant_id = registry_client.create_grant(&owner, &title, &desc, &cat, &10000i128, &1000u64, &3u32);

        // Register escrow first (needed by constructor)
        let escrow_id = env.register(GrantEscrowContract, (admin.clone(), registry_id.clone(), admin.clone()));
        let app_id = env.register(GrantApplicationContract, (admin.clone(), registry_id.clone(), escrow_id.clone()));
        let app_client = GrantApplicationContractClient::new(&env, &app_id);
        let escrow_client = grant_escrow::GrantEscrowContractClient::new(&env, &escrow_id);
        escrow_client.set_application_contract(&app_id);

        let app_name = String::from_str(&env, "Farmer Joe");
        let proj_title = String::from_str(&env, "Solar Irrigation");
        let prop = String::from_str(&env, "Solar prop detail...");
        let submission_id = app_client.submit_application(&applicant, &grant_id, &app_name, &proj_title, &prop, &10000i128);
        assert_eq!(submission_id, 1);

        let app_state = app_client.get_application(&1).unwrap();
        assert_eq!(app_state.status, 0);

        // Verify stored escrow address matches
        let stored_escrow = app_client.get_escrow_contract();
        assert_eq!(stored_escrow, Some(escrow_id));
    }

    #[test]
    fn approve_application_test() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let owner = Address::generate(&env);
        let applicant = Address::generate(&env);

        let registry_id = env.register(GrantRegistryContract, (admin.clone(),));
        let registry_client = grant_registry::GrantRegistryContractClient::new(&env, &registry_id);

        let title = String::from_str(&env, "Agri Fund");
        let desc = String::from_str(&env, "Agri Desc");
        let cat = String::from_str(&env, "Agriculture");
        let grant_id = registry_client.create_grant(&owner, &title, &desc, &cat, &10000i128, &1000u64, &3u32);

        let escrow_id = env.register(GrantEscrowContract, (admin.clone(), registry_id.clone(), admin.clone()));
        // GrantApplicationContract now takes escrow address in constructor — no runtime injection possible
        let app_id = env.register(GrantApplicationContract, (admin.clone(), registry_id.clone(), escrow_id.clone()));
        let app_client = GrantApplicationContractClient::new(&env, &app_id);
        let escrow_client = grant_escrow::GrantEscrowContractClient::new(&env, &escrow_id);
        escrow_client.set_application_contract(&app_id);

        let app_name = String::from_str(&env, "Farmer Joe");
        let proj_title = String::from_str(&env, "Solar Irrigation");
        let prop = String::from_str(&env, "Solar prop detail...");
        app_client.submit_application(&applicant, &grant_id, &app_name, &proj_title, &prop, &10000i128);

        let milestone_amounts: Vec<i128> = Vec::from_array(&env, [3000i128, 4000i128, 3000i128]);
        // escrow address comes from storage now, no address parameter
        app_client.approve_application(&1, &milestone_amounts);

        let approved_app = app_client.get_application(&1).unwrap();
        assert_eq!(approved_app.status, 1);
    }

    #[test]
    fn reject_application_test() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let owner = Address::generate(&env);
        let applicant = Address::generate(&env);

        let registry_id = env.register(GrantRegistryContract, (admin.clone(),));
        let registry_client = grant_registry::GrantRegistryContractClient::new(&env, &registry_id);

        let title = String::from_str(&env, "Agri Fund");
        let desc = String::from_str(&env, "Agri Desc");
        let cat = String::from_str(&env, "Agriculture");
        let grant_id = registry_client.create_grant(&owner, &title, &desc, &cat, &10000i128, &1000u64, &3u32);

        let escrow_id = env.register(GrantEscrowContract, (admin.clone(), registry_id.clone(), admin.clone()));
        let app_id = env.register(GrantApplicationContract, (admin.clone(), registry_id.clone(), escrow_id.clone()));
        let app_client = GrantApplicationContractClient::new(&env, &app_id);
        let escrow_client = grant_escrow::GrantEscrowContractClient::new(&env, &escrow_id);
        escrow_client.set_application_contract(&app_id);

        let app_name = String::from_str(&env, "Farmer Joe");
        let proj_title = String::from_str(&env, "Solar Irrigation");
        let prop = String::from_str(&env, "Solar prop detail...");
        app_client.submit_application(&applicant, &grant_id, &app_name, &proj_title, &prop, &10000i128);

        app_client.reject_application(&1);

        let rejected_app = app_client.get_application(&1).unwrap();
        assert_eq!(rejected_app.status, 2); // Rejected
    }
}
