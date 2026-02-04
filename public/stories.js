/* ===============================
   STORIES GRID CONTROLLER
================================ */

const grid = document.getElementById("storyGrid");

async function loadStories() {
  try {
    const res = await fetch("/data/stories/index.json");
    if (!res.ok) throw new Error("Index not found");

    const stories = await res.json();
    renderStories(stories);
  } catch (e) {
    grid.innerHTML = "<p>❌ Không tải được danh sách truyện</p>";
    console.error(e);
  }
}


function tagClass(tag){
  const map = {
    "Ngôn tình": "tag-ngon-tinh",
    "Hào môn": "tag-hao-mon",
    "Trọng sinh": "tag-trong-sinh",
    "Nữ cường": "tag-nu-cuong",
    "Hiện đại": "tag-hien-dai",
    "HE": "tag-he",
    "VIP": "tag-vip",
    "Phá án": "tag-pha-an",
    "Trinh thám": "tag-trinh-tham",
    "Tâm lý": "tag-tam-ly",
    "Dark": "tag-dark",
  };
  return map[tag] || "";
}



function renderStories(stories) {
  grid.innerHTML = "";

  stories.forEach(story => {
    const card = document.createElement("div");
    card.className = "story-card";

const tagsHTML = Array.isArray(story.tags)
  ? story.tags.slice(0, 3).map(t =>
      `<span class="story-tag ${tagClass(t)}">${t}</span>`
    ).join("")
  : "";

    card.innerHTML = `
      <img class="story-cover" src="${story.cover}">
      <div class="story-info">
        <div class="story-title">${story.title}</div>
        <div class="story-author">✍️ ${story.author}</div>
        <div class="story-tags">${tagsHTML}</div>
      </div>
    `;

    card.onclick = () => {
      location.href = `/story-detail.html?story=${story.id}`;
    };

    grid.appendChild(card);
  });
}


// INIT
loadStories();
