// ===== Player Page Logic =====
document.addEventListener("DOMContentLoaded", () => {
    const currentUser = FCWolvesUtils.getFromLocalStorage("currentUser");
    const currentUserType = FCWolvesUtils.getFromLocalStorage("currentUserType");

    if (!currentUser || currentUserType !== "player") {
        window.location.href = "index.html"; // Redirect if not player
        return;
    }

    // Display player content
    const playerContainer = document.querySelector(".player-content");
    const navItems = document.querySelectorAll(".player-nav-item");
    const tabContents = document.querySelectorAll(".tab-content");

    // Set initial active tab
    showTab("team-tab");

    navItems.forEach(item => {
        item.addEventListener("click", () => {
            const tabId = item.dataset.tab + "-tab";
            showTab(tabId);
        });
    });

    function showTab(tabId) {
        tabContents.forEach(content => {
            content.style.display = "none";
        });
        navItems.forEach(item => {
            item.classList.remove("active");
        });

        document.getElementById(tabId).style.display = "block";
        document.querySelector(`[data-tab="${tabId.replace("-tab", "")}"]`).classList.add("active");

        // Load content based on tab
        switch (tabId) {
            case "team-tab":
                loadTeamContent();
                break;
            case "posts-tab":
                loadPostsContent();
                break;
            case "chat-tab":
                loadChatContent();
                break;
            case "profile-tab":
                loadProfileContent();
                break;
        }
    }

    async function loadTeamContent() {
        const teamTab = document.getElementById("team-tab");
        const players = await FCWolvesUtils.loadData("players") || [];
        const matches = await FCWolvesUtils.loadData("matches") || [];

        let playersHtml = players.map(p => `<li>${p.name} - ${p.position} (#${p.number})</li>`).join("");
        if (players.length === 0) playersHtml = "<p>لا يوجد لاعبون مسجلون بعد.</p>";

        let matchesHtml = matches.map(m => `<li>${m.opponentName} - ${FCWolvesUtils.formatDate(m.matchTime)} - ${m.matchLocation} (${m.matchType})</li>`).join("");
        if (matches.length === 0) matchesHtml = "<p>لا توجد مباريات مجدولة بعد.</p>";

        teamTab.innerHTML = `
            <h2>الفريق</h2>
            <h3>قائمة اللاعبين:</h3>
            <ul>${playersHtml}</ul>
            <h3>المباريات القادمة:</h3>
            <ul>${matchesHtml}</ul>
        `;
    }

    async function loadPostsContent() {
        const postsTab = document.getElementById("posts-tab");
        postsTab.innerHTML = `
            <h2>المنشورات</h2>
            <div class="post-input">
                <textarea id="postText" placeholder="ماذا يدور في ذهنك يا ${currentUser.name}؟"></textarea>
                <button id="publishPostBtn">نشر</button>
            </div>
            <div id="postsList"></div>
        `;

        const publishPostBtn = document.getElementById("publishPostBtn");
        publishPostBtn.addEventListener("click", publishPost);
        loadPosts();
    }

    async function publishPost() {
        const postText = document.getElementById("postText").value.trim();
        if (!postText) {
            FCWolvesUtils.showMessage("الرجاء كتابة محتوى المنشور.", "error");
            return;
        }

        const newPost = {
            author: currentUser.name,
            authorCode: currentUser.code,
            text: postText,
            timestamp: new Date().toISOString(),
            likes: 0,
            comments: []
        };

        await FCWolvesUtils.pushData("posts", newPost);
        FCWolvesUtils.showMessage("تم نشر المنشور بنجاح!");
        document.getElementById("postText").value = "";
        loadPosts();
    }

    async function loadPosts() {
        const postsList = document.getElementById("postsList");
        const posts = await FCWolvesUtils.loadData("posts") || {};
        const postsArray = Object.values(posts).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        if (postsArray.length === 0) {
            postsList.innerHTML = "<p>لا توجد منشورات بعد.</p>";
            return;
        }

        postsList.innerHTML = postsArray.map(post => `
            <div class="post-item">
                <div class="post-header">
                    <span class="post-author">${post.author}</span>
                    <span class="post-time">${FCWolvesUtils.formatDate(post.timestamp)}</span>
                </div>
                <p class="post-text">${post.text}</p>
                <div class="post-actions">
                    <button onclick="likePost('${post.id}')"><i class="fas fa-thumbs-up"></i> إعجاب (${post.likes || 0})</button>
                    <button onclick="showComments('${post.id}')"><i class="fas fa-comment"></i> تعليقات (${post.comments ? post.comments.length : 0})</button>
                </div>
                <div class="post-comments" id="comments-${post.id}" style="display:none;">
                    <!-- Comments will be loaded here -->
                </div>
            </div>
        `).join("");
    }

    // Dummy functions for like and comments (needs Firebase integration)
    window.likePost = async (postId) => {
        const posts = await FCWolvesUtils.loadData("posts") || {};
        if (posts[postId]) {
            posts[postId].likes = (posts[postId].likes || 0) + 1;
            await FCWolvesUtils.saveData("posts", posts);
            loadPosts();
        }
    };

    window.showComments = async (postId) => {
        const commentsDiv = document.getElementById(`comments-${postId}`);
        if (commentsDiv.style.display === "none") {
            const posts = await FCWolvesUtils.loadData("posts") || {};
            const post = posts[postId];
            if (post && post.comments) {
                commentsDiv.innerHTML = post.comments.map(comment => `
                    <div class="comment-item">
                        <strong>${comment.author}:</strong> ${comment.text}
                    </div>
                `).join("");
            }
            commentsDiv.innerHTML += `
                <div class="add-comment">
                    <input type="text" id="commentInput-${postId}" placeholder="أضف تعليق...">
                    <button onclick="addComment('${postId}')">إضافة</button>
                </div>
            `;
            commentsDiv.style.display = "block";
        } else {
            commentsDiv.style.display = "none";
        }
    };

    window.addComment = async (postId) => {
        const commentInput = document.getElementById(`commentInput-${postId}`);
        const commentText = commentInput.value.trim();
        if (!commentText) return;

        const posts = await FCWolvesUtils.loadData("posts") || {};
        if (posts[postId]) {
            if (!posts[postId].comments) {
                posts[postId].comments = [];
            }
            posts[postId].comments.push({
                author: currentUser.name,
                text: commentText,
                timestamp: new Date().toISOString()
            });
            await FCWolvesUtils.saveData("posts", posts);
            commentInput.value = "";
            showComments(postId); // Reload comments
        }
    };

    async function loadChatContent() {
        const chatTab = document.getElementById("chat-tab");
        chatTab.innerHTML = `
            <h2>الدردشة الجماعية</h2>
            <div class="chat-messages" id="chatMessages"></div>
            <div class="chat-input">
                <input type="text" id="chatMessageInput" placeholder="اكتب رسالتك...">
                <button id="sendChatMessageBtn">إرسال</button>
            </div>
        `;

        const chatMessageInput = document.getElementById("chatMessageInput");
        const sendChatMessageBtn = document.getElementById("sendChatMessageBtn");
        sendChatMessageBtn.addEventListener("click", sendChatMessage);
        chatMessageInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                sendChatMessage();
            }
        });
        loadChatMessages();
    }

    async function sendChatMessage() {
        const chatMessageInput = document.getElementById("chatMessageInput");
        const messageText = chatMessageInput.value.trim();
        if (!messageText) return;

        const newMessage = {
            author: currentUser.name,
            text: messageText,
            timestamp: new Date().toISOString()
        };

        await FCWolvesUtils.pushData("chatMessages", newMessage);
        chatMessageInput.value = "";
    }

    async function loadChatMessages() {
        const chatMessagesDiv = document.getElementById("chatMessages");
        // Listen for new messages in real-time
        if (FCWolvesUtils.db) {
            FCWolvesUtils.db.ref("chatMessages").on("value", (snapshot) => {
                const messages = snapshot.val() || {};
                const messagesArray = Object.values(messages).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                chatMessagesDiv.innerHTML = messagesArray.map(msg => `
                    <div class="chat-message-item">
                        <strong>${msg.author}:</strong> ${msg.text}
                        <span class="chat-time">${FCWolvesUtils.formatDate(msg.timestamp)}</span>
                    </div>
                `).join("");
                chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight; // Scroll to bottom
            });
        }
    }

    function loadProfileContent() {
        const profileTab = document.getElementById("profile-tab");
        profileTab.innerHTML = `
            <h2>الملف الشخصي</h2>
            <div class="profile-card">
                <img src="images/default-avatar.png" alt="صورة اللاعب" class="profile-avatar">
                <h3>${currentUser.name}</h3>
                <p><strong>رمز الدخول:</strong> ${currentUser.code}</p>
                <p><strong>المركز:</strong> ${currentUser.position}</p>
                <p><strong>رقم القميص:</strong> ${currentUser.number}</p>
                <p><strong>الوصف:</strong> لاعب أسطوري في فريق FC Wolves!</p>
            </div>
        `;
    }
});

