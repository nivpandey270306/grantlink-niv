#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, Address, Env, String, Vec,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    GrantNotFound = 1,
    InvalidStatus = 2,
    Unauthorized = 3,
}

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
    pub status: u32, // 0 = Active, 1 = Cancelled, 2 = Completed
}

#[contracttype]
pub enum DataKey {
    NextGrantId,
    Grant(u32),
    Admin,
}

#[contract]
pub struct GrantRegistryContract;

#[contractimpl]
impl GrantRegistryContract {
    pub fn __constructor(env: Env, admin: Address) {
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::NextGrantId, &1u32);
    }

    pub fn create_grant(
        env: Env,
        owner: Address,
        title: String,
        description: String,
        category: String,
        amount: i128,
        deadline: u64,
        milestone_count: u32,
    ) -> u32 {
        owner.require_auth();

        let mut next_id: u32 = env
            .storage()
            .instance()
            .get(&DataKey::NextGrantId)
            .unwrap_or(1);
        let grant = Grant {
            id: next_id,
            owner: owner.clone(),
            title: title.clone(),
            description: description.clone(),
            category: category.clone(),
            amount,
            deadline,
            milestone_count,
            status: 0,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Grant(next_id), &grant);

        // Extend TTL
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::Grant(next_id), 17280, 518400);

        next_id += 1;
        env.storage()
            .instance()
            .set(&DataKey::NextGrantId, &next_id);
        env.storage().instance().extend_ttl(17280, 518400);

        // Emit Event
        env.events()
            .publish((symbol_short!("created"), owner, next_id - 1), amount);

        next_id - 1
    }

    pub fn update_grant(
        env: Env,
        id: u32,
        title: String,
        description: String,
        category: String,
    ) -> Result<(), Error> {
        let mut grant: Grant = env
            .storage()
            .persistent()
            .get(&DataKey::Grant(id))
            .ok_or(Error::GrantNotFound)?;

        grant.owner.require_auth();

        grant.title = title;
        grant.description = description;
        grant.category = category;

        env.storage().persistent().set(&DataKey::Grant(id), &grant);
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::Grant(id), 17280, 518400);

        // Emit Event
        env.events()
            .publish((symbol_short!("updated"), grant.owner, id), ());

        Ok(())
    }

    pub fn cancel_grant(env: Env, id: u32) -> Result<(), Error> {
        let mut grant: Grant = env
            .storage()
            .persistent()
            .get(&DataKey::Grant(id))
            .ok_or(Error::GrantNotFound)?;

        grant.owner.require_auth();

        if grant.status != 0 {
            return Err(Error::InvalidStatus);
        }

        grant.status = 1; // Cancelled
        env.storage().persistent().set(&DataKey::Grant(id), &grant);
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::Grant(id), 17280, 518400);

        // Emit Event
        env.events()
            .publish((symbol_short!("cancelled"), grant.owner, id), ());

        Ok(())
    }

    pub fn get_grant(env: Env, id: u32) -> Option<Grant> {
        env.storage().persistent().get(&DataKey::Grant(id))
    }

    pub fn list_grants(env: Env) -> Vec<Grant> {
        let next_id: u32 = env
            .storage()
            .instance()
            .get(&DataKey::NextGrantId)
            .unwrap_or(1);
        let mut grants = Vec::new(&env);
        for id in 1..next_id {
            if let Some(grant) = env
                .storage()
                .persistent()
                .get::<DataKey, Grant>(&DataKey::Grant(id))
            {
                grants.push_back(grant);
            }
        }
        grants
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env, IntoVal};

    #[test]
    fn create_grant_test() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let owner = Address::generate(&env);

        let contract_id = env.register(GrantRegistryContract, (admin.clone(),));
        let client = GrantRegistryContractClient::new(&env, &contract_id);

        let title = String::from_str(&env, "Test Grant");
        let description = String::from_str(&env, "Test Description");
        let category = String::from_str(&env, "Education");

        let grant_id = client.create_grant(
            &owner,
            &title,
            &description,
            &category,
            &10000i128,
            &1000u64,
            &3u32,
        );

        assert_eq!(grant_id, 1);

        let grant = client.get_grant(&1).unwrap();
        assert_eq!(grant.title, title);
        assert_eq!(grant.amount, 10000i128);
        assert_eq!(grant.status, 0);
    }

    #[test]
    fn update_grant_test() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let owner = Address::generate(&env);

        let contract_id = env.register(GrantRegistryContract, (admin.clone(),));
        let client = GrantRegistryContractClient::new(&env, &contract_id);

        let title = String::from_str(&env, "Test Grant");
        let description = String::from_str(&env, "Test Description");
        let category = String::from_str(&env, "Education");

        client.create_grant(
            &owner,
            &title,
            &description,
            &category,
            &10000i128,
            &1000u64,
            &3u32,
        );

        let new_title = String::from_str(&env, "New Test Grant");
        client.update_grant(&1, &new_title, &description, &category);

        let updated_grant = client.get_grant(&1).unwrap();
        assert_eq!(updated_grant.title, new_title);
    }

    #[test]
    fn cancel_grant_test() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let owner = Address::generate(&env);

        let contract_id = env.register(GrantRegistryContract, (admin.clone(),));
        let client = GrantRegistryContractClient::new(&env, &contract_id);

        let title = String::from_str(&env, "Test Grant");
        let description = String::from_str(&env, "Test Description");
        let category = String::from_str(&env, "Education");

        client.create_grant(
            &owner,
            &title,
            &description,
            &category,
            &10000i128,
            &1000u64,
            &3u32,
        );
        client.cancel_grant(&1);

        let cancelled_grant = client.get_grant(&1).unwrap();
        assert_eq!(cancelled_grant.status, 1);
    }

    #[test]
    fn unauthorized_test() {
        let env = Env::default();
        let admin = Address::generate(&env);
        let owner = Address::generate(&env);
        let non_owner = Address::generate(&env);

        let contract_id = env.register(GrantRegistryContract, (admin.clone(),));
        let client = GrantRegistryContractClient::new(&env, &contract_id);

        let title = String::from_str(&env, "Test Grant");
        let description = String::from_str(&env, "Test Description");
        let category = String::from_str(&env, "Education");

        env.mock_all_auths();
        client.create_grant(
            &owner,
            &title,
            &description,
            &category,
            &10000i128,
            &1000u64,
            &3u32,
        );

        // Attempting to update a grant as a non-owner should result in authorization failure
        env.mock_auths(&[soroban_sdk::testutils::MockAuth {
            address: &non_owner,
            invoke: &soroban_sdk::testutils::MockAuthInvoke {
                contract: &contract_id,
                fn_name: "update_grant",
                args: (1u32, title.clone(), description.clone(), category.clone()).into_val(&env),
                sub_invokes: &[],
            },
        }]);

        let res = client.try_update_grant(&1, &title, &description, &category);
        assert!(res.is_err());
    }
}
