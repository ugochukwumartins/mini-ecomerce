const token=localStorage.getItem("adminToken");
if(!token) location.href="admin-login.html";

function logout(){
localStorage.removeItem("adminToken");
location.href="admin-login.html";
}

const form=document.getElementById("addForm");
const tbody=document.getElementById("adminProducts");

form.onsubmit=async e=>{
e.preventDefault();
await fetch("http://localhost:5000/products",{
method:"POST",
headers:{Authorization:token},
body:new FormData(form)
});
form.reset();
load();
};

async function load(){
const res=await fetch("http://localhost:5000/products");
const data=await res.json();
tbody.innerHTML="";
data.forEach(p=>{
tbody.innerHTML+=`
<tr>
<td><img src="http://localhost:5000/uploads/${p.image}" width="50"></td>
<td>${p.name}</td>
<td>${p.amount}</td>
<td>${p.quantity}</td>
<td><button onclick="del('${p._id}')">Delete</button></td>
</tr>`;
});
}

async function del(id){
await fetch("http://localhost:5000/products/"+id,{
method:"DELETE",
headers:{Authorization:token}
});
load();
}
load();
