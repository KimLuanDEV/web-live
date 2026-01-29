const params = new URLSearchParams(location.search);
const asset = params.get("asset") || "gold";

const me = JSON.parse(localStorage.getItem("user_profile")||"{}");
document.getElementById("myCoin").textContent = me.coins || 0;


const config = {
  gold:    { name:"🥇 Vàng", min:-5, max:8,  vol:1 },
  silver:  { name:"🥈 Bạc", min:-3, max:5,  vol:1.5 },
  diamond: { name:"💎 Kim cương", min:-10,max:15, vol:3 }
};

const c = config[asset];

document.getElementById("assetTitle").textContent =
  `📈 Phân tích ${c.name}`;

document.getElementById("analysisText").innerHTML = `
  <li>📉 Rủi ro tối đa: ${c.min}%</li>
  <li>📈 Lợi nhuận kỳ vọng: ${c.max}%</li>
  <li>⚠️ Biến động thị trường ngẫu nhiên</li>
`;
