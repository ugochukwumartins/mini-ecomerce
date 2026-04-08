async function load(){
const res = await fetch("http://localhost:5000/products");
const data = await res.json();
const div = document.getElementById("products");
div.innerHTML="";
data.forEach(p=>{
div.innerHTML+=`
<div class="product">
<img src="http://localhost:5000/uploads/${p.image}">
<h3>${p.name}</h3>
<p>₦${p.amount}</p>
<p>${p.details}</p>
</div>`;
});
}
load();
