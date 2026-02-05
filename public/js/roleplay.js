const rpName = document.getElementById("rpName");
const rpGender = document.getElementById("rpGender");
const rpBirth = document.getElementById("rpBirth");
const rpConfirm = document.getElementById("rpConfirm");
const ageHint = document.getElementById("ageHint");
const btnCreate = document.getElementById("btnCreateRole");

function checkValid(){
  const name = rpName.value.trim();
  const gender = rpGender.value;
  const birth = parseInt(rpBirth.value);
  const year = new Date().getFullYear();
  const age = birth ? year - birth : 0;

  if (birth) {
    ageHint.textContent =
      age >= 18
        ? `Tuổi hiện tại: ${age}`
        : `❌ Phải đủ 18 tuổi`;
  } else {
    ageHint.textContent = "";
  }

  const isValid =
    name &&
    gender &&
    age >= 18 &&
    rpConfirm.checked;

  btnCreate.disabled = !isValid;
  btnCreate.classList.toggle("active", isValid);
}

rpName.oninput = checkValid;
rpGender.onchange = checkValid;
rpBirth.oninput = checkValid;
rpConfirm.onchange = checkValid;

btnCreate.onclick = () => {
  if (btnCreate.disabled) return;

  alert(
    "⚠️ Nhân vật sẽ được tạo vĩnh viễn.\n" +
    "Không thể xóa hoặc tạo lại.\n\n" +
    "Bước tiếp theo: gửi dữ liệu lên backend."
  );
};
