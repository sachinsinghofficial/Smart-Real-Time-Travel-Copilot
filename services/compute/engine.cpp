#include <algorithm>
#include <atomic>
#include <chrono>
#include <cmath>
#include <condition_variable>
#include <cstring>
#include <cstdlib>
#include <deque>
#include <iostream>
#include <sstream>
#include <stdexcept>
#include <string>
#include <thread>
#include <vector>
#include <filesystem>
#include <sys/socket.h>
#include <sys/stat.h>
#include <sys/un.h>
#include <sys/wait.h>
#include <poll.h>
#include <unistd.h>
#include <signal.h>
#if defined(__x86_64__) && defined(__GNUC__)
#include <immintrin.h>
__attribute__((target("avx512f"))) double dot_avx(const double* a,const double* b,size_t n){__m512d sum=_mm512_setzero_pd();size_t i=0;for(;i+8<=n;i+=8)sum=_mm512_add_pd(sum,_mm512_mul_pd(_mm512_loadu_pd(a+i),_mm512_loadu_pd(b+i)));double out=_mm512_reduce_add_pd(sum);for(;i<n;i++)out+=a[i]*b[i];return out;}
#endif
#ifdef TRAVELSETU_CUDA
extern double cuda_dot(const double*,const double*,size_t);
#endif
struct Point{double lat,lon;};
constexpr double rad=3.14159265358979323846/180;
double distance(Point a,Point b){double x=std::pow(std::sin((b.lat-a.lat)*rad/2),2)+std::cos(a.lat*rad)*std::cos(b.lat*rad)*std::pow(std::sin((b.lon-a.lon)*rad/2),2);return 6371*2*std::atan2(std::sqrt(std::clamp(x,0.0,1.0)),std::sqrt(std::max(0.0,1-x)));}
double dot(const std::vector<double>& a,const std::vector<double>& b){
#if defined(__x86_64__) && defined(__GNUC__)
 if(__builtin_cpu_supports("avx512f"))return dot_avx(a.data(),b.data(),a.size());
#endif
 double result=0;for(size_t i=0;i<a.size();i++)result+=a[i]*b[i];return result;
}
std::string escape(const std::string& value){std::string out;for(unsigned char c:value){if(c=='"'||c=='\\'){out+='\\';out+=c;}else if(c=='\n')out+="\\n";else if(c=='\r')out+="\\r";else if(c=='\t')out+="\\t";else if(c>=32)out+=c;}return out;}
// Optional llama.cpp CLI adapter. Fixed executable/model paths come only from operator environment.
std::string infer(const std::string& prompt){const char* binary=getenv("LLAMA_CLI"),*model=getenv("LLAMA_MODEL");if(!binary||!model||binary[0]!='/'||model[0]!='/')throw std::runtime_error("Local model not configured");if(prompt.empty()||prompt.size()>8000)throw std::runtime_error("Invalid prompt");int fds[2];if(pipe(fds))throw std::runtime_error("Pipe failed");pid_t child=fork();if(child<0){close(fds[0]);close(fds[1]);throw std::runtime_error("Model process failed");}if(child==0){dup2(fds[1],STDOUT_FILENO);close(fds[0]);close(fds[1]);execl(binary,binary,"-m",model,"-p",prompt.c_str(),"-n","512","--no-display-prompt","--no-conversation",(char*)nullptr);_exit(127);}close(fds[1]);std::string output;auto deadline=std::chrono::steady_clock::now()+std::chrono::seconds(90);bool done=false;while(std::chrono::steady_clock::now()<deadline&&output.size()<65536){pollfd p{fds[0],POLLIN,0};int state=poll(&p,1,200);if(state>0){char buf[2048];auto size=read(fds[0],buf,sizeof(buf));if(size<=0){done=true;break;}output.append(buf,size);}}close(fds[0]);if(!done)kill(child,SIGKILL);int status=0;waitpid(child,&status,0);if(!done||!WIFEXITED(status)||WEXITSTATUS(status)!=0)throw std::runtime_error("Local inference failed or timed out");return "{\"provider\":\"llama.cpp\",\"text\":\""+escape(output)+"\"}";}
std::string compute(const std::string& line){std::istringstream in(line);std::string op;in>>op;std::ostringstream out;out.precision(12);
 if(op=="PING")return "{\"ok\":true,\"engine\":\"cpp20\"}";
 if(op=="LLM"){std::string prompt;std::getline(in,prompt);return infer(prompt);}
 size_t n=0;if(!(in>>n)||n<1||n>4096)throw std::runtime_error("Invalid size");
 if(op=="ROUTE"){if(n>64)throw std::runtime_error("Maximum 64 stops");std::vector<Point> p(n);for(auto& x:p)if(!(in>>x.lat>>x.lon)||!std::isfinite(x.lat)||!std::isfinite(x.lon)||std::abs(x.lat)>90||std::abs(x.lon)>180)throw std::runtime_error("Invalid coordinates");std::string extra;if(in>>extra)throw std::runtime_error("Trailing input");std::vector<std::vector<double>> matrix(n,std::vector<double>(n));for(size_t a=0;a<n;a++)for(size_t b=a+1;b<n;b++)matrix[a][b]=matrix[b][a]=distance(p[a],p[b]);std::vector<bool> used(n);std::vector<size_t> order{0};used[0]=true;double km=0;while(order.size()<n){size_t best=n;for(size_t j=0;j<n;j++)if(!used[j]&&(best==n||matrix[order.back()][j]<matrix[order.back()][best]))best=j;km+=matrix[order.back()][best];used[best]=true;order.push_back(best);}out<<"{\"order\":[";for(size_t i=0;i<n;i++)out<<(i?",":"")<<order[i];out<<"],\"distanceKm\":"<<km<<",\"basis\":\"geographic-nearest-neighbour\",\"navigation\":false}";return out.str();}
 if(op=="DOT"||op=="DOT_GPU"){std::vector<double>a(n),b(n);for(auto& v:a)if(!(in>>v)||!std::isfinite(v)||std::abs(v)>1e100)throw std::runtime_error("Invalid vector");for(auto& v:b)if(!(in>>v)||!std::isfinite(v)||std::abs(v)>1e100)throw std::runtime_error("Invalid vector");std::string extra;if(in>>extra)throw std::runtime_error("Trailing input");double value=0;if(op=="DOT_GPU"){
#ifdef TRAVELSETU_CUDA
 value=cuda_dot(a.data(),b.data(),n);
#else
 throw std::runtime_error("CUDA is not enabled in this build");
#endif
 }else value=dot(a,b);out<<"{\"value\":"<<value<<"}";return out.str();}throw std::runtime_error("Unknown operation");}
void client(int fd){timeval timeout{5,0};setsockopt(fd,SOL_SOCKET,SO_RCVTIMEO,&timeout,sizeof(timeout));setsockopt(fd,SOL_SOCKET,SO_SNDTIMEO,&timeout,sizeof(timeout));std::string line;char buf[2048];bool complete=false;while(line.size()<65536){auto n=recv(fd,buf,sizeof(buf),0);if(n<=0)break;line.append(buf,n);auto end=line.find('\n');if(end!=std::string::npos){line.resize(end);complete=true;break;}}std::string result;try{if(!complete||line.size()>=65536)throw std::runtime_error("Invalid frame");result=compute(line);}catch(const std::exception& e){result="{\"error\":\""+escape(e.what())+"\"}";}result+='\n';size_t offset=0;while(offset<result.size()){auto n=send(fd,result.data()+offset,result.size()-offset,0);if(n<=0)break;offset+=n;}close(fd);}
int main(int argc,char**argv){signal(SIGPIPE,SIG_IGN);if(argc==3&&std::string(argv[1])=="--request"){try{std::cout<<compute(argv[2])<<std::endl;return 0;}catch(const std::exception& e){std::cerr<<e.what()<<std::endl;return 1;}}if(argc>1&&std::string(argv[1])=="--self-test"){if(std::abs(distance({0,0},{0,0}))>1e-10||dot({1,2,3},{4,5,6})!=32)return 1;std::cout<<compute("ROUTE 3 0 0 0 2 0 1")<<'\n';return 0;}const char* configured=getenv("COMPUTE_SOCKET");std::string path=configured?configured:"/tmp/travelsetu-"+std::to_string(getuid())+"/engine.sock";auto dir=std::filesystem::path(path).parent_path();const bool created=std::filesystem::create_directories(dir);struct stat info{};if(lstat(dir.c_str(),&info)||!S_ISDIR(info.st_mode)||info.st_uid!=getuid()){std::cerr<<"Socket directory must be owned by this user\n";return 1;}if(created)chmod(dir.c_str(),0700);else if(info.st_mode&0077){std::cerr<<"Use a dedicated private socket directory (mode 0700)\n";return 1;}if(std::filesystem::exists(path)){std::cerr<<"Socket exists. Stop the previous engine and remove its stale socket before restart.\n";return 1;}int server=socket(AF_UNIX,SOCK_STREAM,0);if(server<0){perror("Unix socket unavailable");return 1;}sockaddr_un address{};address.sun_family=AF_UNIX;if(path.size()>=sizeof(address.sun_path))return 1;std::strcpy(address.sun_path,path.c_str());if(bind(server,(sockaddr*)&address,sizeof(address))||chmod(path.c_str(),0600)||listen(server,64)){perror("socket");return 1;}std::mutex mutex;std::condition_variable cv;std::deque<int> queue;for(int i=0;i<4;i++)std::thread([&]{while(true){int fd;{std::unique_lock lock(mutex);cv.wait(lock,[&]{return !queue.empty();});fd=queue.front();queue.pop_front();}client(fd);}}).detach();std::cout<<"C++ compute ready at "<<path<<std::endl;while(true){int fd=accept(server,nullptr,nullptr);if(fd<0)continue;std::lock_guard lock(mutex);if(queue.size()>=64){close(fd);continue;}queue.push_back(fd);cv.notify_one();}}
