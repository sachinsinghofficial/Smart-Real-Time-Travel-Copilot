// Optional operator-only report tool; normal app data access remains subject to Supabase RLS.
#include <pqxx/pqxx>
#include <cstdlib>
#include <iostream>
int main(){try{const char* url=std::getenv("DATABASE_URL");if(!url)throw std::runtime_error("DATABASE_URL is required");pqxx::connection db(url);pqxx::read_transaction tx(db);const auto r=tx.exec("select count(*)::bigint as trips from public.trips");std::cout<<"Trips: "<<r[0][0].as<long long>()<<'\n';}catch(const std::exception&){std::cerr<<"Database report failed; check connection and read-only role permissions.\n";return 1;}}
