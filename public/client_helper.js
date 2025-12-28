
const currentProfile = { name: "User", avatar: "" };

function getAvatar(url, name){
  return url || `https://i.pravatar.cc/80?u=${encodeURIComponent(name||"user")}`;
}

function bindProfileUI(socket, roomId, nameInputId, avatarInputId){
  const nameInput = document.getElementById(nameInputId);
  const avatarInput = document.getElementById(avatarInputId);

  if (nameInput){
    nameInput.addEventListener("change", () => {
      currentProfile.name = nameInput.value.trim() || "User";
      socket.emit("update-profile", { roomId, profile: currentProfile });
    });
  }

  if (avatarInput){
    avatarInput.addEventListener("change", () => {
      const file = avatarInput.files[0];
      if (!file) return;
      if (file.size > 300 * 1024){
        alert("Ảnh tối đa 300KB");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        currentProfile.avatar = reader.result;
        socket.emit("update-profile", { roomId, profile: currentProfile });
      };
      reader.readAsDataURL(file);
    });
  }
}
