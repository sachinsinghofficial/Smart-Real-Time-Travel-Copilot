#include <cuda_runtime.h>
#include <stdexcept>
#include <vector>
__global__ void multiply(const double* a,const double* b,double* out,size_t n){size_t i=blockIdx.x*blockDim.x+threadIdx.x;if(i<n)out[i]=a[i]*b[i];}
double cuda_dot(const double* a,const double* b,size_t n){double *da=nullptr,*db=nullptr,*dc=nullptr;auto check=[](cudaError_t e){if(e!=cudaSuccess)throw std::runtime_error(cudaGetErrorString(e));};try{check(cudaMalloc(&da,n*sizeof(double)));check(cudaMalloc(&db,n*sizeof(double)));check(cudaMalloc(&dc,n*sizeof(double)));check(cudaMemcpy(da,a,n*sizeof(double),cudaMemcpyHostToDevice));check(cudaMemcpy(db,b,n*sizeof(double),cudaMemcpyHostToDevice));multiply<<<(n+255)/256,256>>>(da,db,dc,n);check(cudaGetLastError());std::vector<double> out(n);check(cudaMemcpy(out.data(),dc,n*sizeof(double),cudaMemcpyDeviceToHost));cudaFree(da);cudaFree(db);cudaFree(dc);double result=0;for(double v:out)result+=v;return result;}catch(...){cudaFree(da);cudaFree(db);cudaFree(dc);throw;}}
