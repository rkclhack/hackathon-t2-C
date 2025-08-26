<script setup>
import { inject, ref, reactive, onMounted, useTemplateRef, computed } from "vue" // computed追加
import socketManager from '../socketManager.js'
import { marked } from "marked"
import '@mdi/font/css/materialdesignicons.css' // Ensure you are using css-loader

// markedの改行オプションをtrueに設定
marked.setOptions({ breaks: true });

// #region global state
const userName = inject("userName")

// #region local variable
const socket = socketManager.getInstance()
// #endregion

// #region reactive variable
const chatContent = ref("")
const chatList = reactive([])
// #endregion

const pipFontSize = ref(16);

const markdown = computed(() => {
  return marked.parse(chatContent.value)
});

// #region lifecycle
onMounted(() => {
  registerSocketEvent()
})
// #endregion

// #region browser event handler
// 投稿メッセージをサーバに送信する
const onPublish = (event) => {
  // 入力内容の前後の空白を削除
  const message = chatContent.value.trim()

  // Ctrl + Enter で送信
  if (event.key === 'Enter' && !event.ctrlKey) return;

  // メッセージが空文字でなければ、サーバーに送信する
  if (message) {
    socket.emit("publishEvent", {
      type: "publish",
      name: userName.value,
      content: markdown.value,
      datetime: Date.now()
    })
  }
  // 入力欄を初期化
  chatContent.value = ""
}

// 退室メッセージをサーバに送信する
const onExit = () => {
  socket.emit("exitEvent", {
    type: "exit",
    name: userName.value,
    datetime: Date.now()
  })
}

// メモを画面上に表示する
const onMemo = () => {
  // メモの内容を表示
  chatList.unshift({ type: "memo", name: userName.value, content: chatContent.value, datetime: Date.now() })

  // 入力欄を初期化
  chatContent.value = ""
}
// #endregion

// #region socket event handler
// サーバから受信した入室メッセージ画面上に表示する
const onReceiveEnter = (data) => {
  chatList.unshift(data)
  onUpdateChatList()
}

// サーバから受信した退室メッセージを受け取り画面上に表示する
const onReceiveExit = (data) => {
  chatList.unshift(data)
  onUpdateChatList()
}

// サーバから受信した投稿メッセージを画面上に表示する
const onReceivePublish = (data) => {
  chatList.unshift(data)
  onUpdateChatList()
}
// #endregion

const onUpdateChatList = () => {
  // jumpToBottom()
}

// #region local methods
// イベント登録をまとめる
const registerSocketEvent = () => {
  // 入室イベントを受け取ったら実行
  socket.on("enterEvent", (data) => {
    onReceiveEnter(data);
  })

  // 退室イベントを受け取ったら実行
  socket.on("exitEvent", (data) => {
    onReceiveExit(data);
  })

  // 投稿イベントを受け取ったら実行
  socket.on("publishEvent", (data) => {
    onReceivePublish(data);
  })

  // 履歴イベントを受け取ったら実行
  socket.on("historyEvent", (data) => {
    // 履歴を画面上に表示
    data.forEach((chat) => {
      chatList.unshift(chat)
    })
  })
}
// #endregion


const jumpToBottom = () => {
  console.log("jumpToBottom");
  // textareaまで移動する
  const textarea = document.querySelector("#pip-textarea");
  if (!textarea) return;
  const target = textarea.getBoundingClientRect().bottom;
  console.log("jump to " + target);
  // scrollTo(0, target);
}

const pipRef = useTemplateRef("pipRef")
const styles = document.head.cloneNode(true).querySelectorAll("style") // headの全てのstyle要素を取得
const head_scripts = document.head.cloneNode(true).querySelectorAll("script") // headの全てのscript要素を取得
const body_scripts = document.body.cloneNode(true).querySelectorAll("script") // bodyの全てのscript要素を取得
// Picture-in-Picture 状態
const pipStatus = ref(false)
const openPip = async () => {
  const pipWindow = await window.documentPictureInPicture.requestWindow({});
  pipWindow.document.body.append(pipRef.value);
  pipWindow.document.head.append(...styles); // 全てのstyle要素をPiPに張り付け
  pipWindow.document.head.append(...head_scripts); // headの全てのscript要素をPiPに張り付け
  pipWindow.document.body.append(...body_scripts); // bodyの全てのscript要素をPiPに張り付け

  pipStatus.value = true;
  // Picture-in-Picture 終了時のイベント登録
  pipWindow.addEventListener('pagehide', (event) => {
    pipStatus.value = false;
    document.body.append(pipRef.value);
  });

  const messageContainer = pipWindow.document.querySelector(".message-container");
  console.log(messageContainer);
  messageContainer.onresize = (event) => {
    console.log("RESIZED", event);
  };
  pipWindow.document.addEventListener("resize", (event) => {
    console.log("RESIZED", event);
  });

  let lastChildElementCount = 0;
  pipWindow.setInterval(() => {
    const ms = pipWindow.document.querySelector(".message-container");
    if (!ms) return;
    const currentChildElementCount = ms.childElementCount;
    if (currentChildElementCount !== lastChildElementCount) {
      lastChildElementCount = currentChildElementCount;
      ms.scroll(0, 99999);
    }
  }, 100);
}

const mouseoverPip = ref(false);
const onPipOver = (event) => {
  mouseoverPip.value = true;
}
const onPipOut = (event) => {
  mouseoverPip.value = false;
}
</script>

<template>
  <v-app class="app">
    <v-app-bar app color="#24292e" dark>
      <v-btn icon @click="onExit" to="/">
        <v-icon>mdi-logout</v-icon>
      </v-btn>
      <v-toolbar-title>Vue.js Chat チャットルーム</v-toolbar-title>
      <p class="ml-auto">ログインユーザ：{{ userName }}さん</p>
    </v-app-bar>

    <div class="mx-auto my-5 px-4 chat" style="padding-top: 64px; padding-bottom: 10px;">
      <div class="mt-10">
        <div class="mt-5" v-if="chatList.length !== 0">
          <ul>
            <li v-for="(chat, i) in chatList" :key="i">
              <div v-if="chat.type === 'enter' || chat.type === 'exit'" class="log-message">
                <span>{{ chat.name }}が{{ chat.type === 'enter' ? '入室' : '退室' }}しました。</span>
                <span class="timestamp">{{ new Date(chat.datetime).toLocaleString() }}</span>
              </div>

              <div v-else class="message-item"
                :class="{ 'my-message': chat.name === userName, 'other-message': chat.name !== userName }">
                <div class="user-info">
                  <span class="user-name">{{ chat.name }}</span>
                  <span class="timestamp">{{ new Date(chat.datetime).toLocaleString() }}</span>
                </div>
                <div class="message-bubble">
                  <div v-if="chat.type === 'publish'" class="markdown-body" v-html="chat.content"></div>
                  <span v-if="chat.type === 'memo'">{{ chat.name }}のメモ：{{ chat.content }}</span>
                </div>
              </div>
            </li>
          </ul>
        </div>

        <div class="input-row">
          <textarea variant="outlined" placeholder="投稿文を入力してください" rows="4" class="area" v-model="chatContent"
            @keydown.enter.ctrl.prevent="onPublish"></textarea>
          <div class="btn-vert">
            <v-btn color="#007FD4" style="margin-left: 5px;" @click="onPublish">
              <v-icon right>mdi-send</v-icon>
            </v-btn>
          </div>
        </div>
      </div>
    </div>

    <v-btn fixed bottom right color="#007FD4" @click="openPip" class="float-btn">
      <v-icon>mdi-open-in-new</v-icon>
    </v-btn>

    <div ref="pipRef" class="mx-auto px-4 pipWrapper" v-show="pipStatus">
      <div class="font-slider-container">
        <input type="range" min="10" max="24" v-model="pipFontSize" class="slider">
      </div>
      <div class="pipFlexLayout" @mouseover="onPipOver" @mouseout="onPipOut">
        <ul class="message-container" v-if="chatList.length !== 0" :style="{ fontSize: pipFontSize + 'px' }">
          <li v-for="(chat, i) in chatList" :key="i">
            <div v-if="chat.type === 'enter' || chat.type === 'exit'" class="log-message">
              <span>{{ chat.name }}が{{ chat.type === 'enter' ? '入室' : '退室' }}しました。</span>
            </div>

            <div v-else class="message-item"
              :class="{ 'my-message': chat.name === userName, 'other-message': chat.name !== userName }">
              <div class="user-info">
                <span class="user-name">{{ chat.name }}</span>
                </div>
              <div class="message-bubble">
                <div v-if="chat.type === 'publish'" class="markdown-body" v-html="chat.content"></div>
                <span v-if="chat.type === 'memo'">メモ：{{ chat.content }}</span>
              </div>
            </div>
          </li>
        </ul>
        <div class="pipInputArea" v-show="mouseoverPip" style="padding-bottom: 10px;">
          <div class="input-row">
            <textarea :placeholder="`ログインユーザ：${userName}`" rows="2" class="inpArea" v-model="chatContent"
              @keydown.enter.ctrl.prevent="onPublish"></textarea>
            <v-btn color="#007FD4" class="send-btn" @click="onPublish">
              <v-icon right>mdi-send</v-icon>
            </v-btn>
          </div>
        </div>
      </div>
    </div>
  </v-app>
</template>

<style scoped>
/* ========== 全体的なスタイル ========== */
.app {
  background-color: #1E1E1E;
  color: #E0E0E0;
}

ul {
  list-style-type: none;
  padding: 0;
}

/* ========== チャットメッセージ ========== */
.message-item {
  display: flex;
  flex-direction: column;
  margin-bottom: 8px;
}

.user-info {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 4px;
}

.user-name {
  font-weight: bold;
}

.timestamp {
  font-size: 0.75rem;
  color: #94A3B8;
}

.message-bubble {
  padding: 5px 10px;
  border-radius: 8px;
  max-width: 70%;
  word-wrap: break-word;
}

/* 他人のメッセージ（左寄せ） */
.other-message {
  align-items: flex-start;
}

.other-message .message-bubble {
  background-color: #30363d;
  border-top-left-radius: 4px;
}

/* 自分のメッセージ（右寄せ） */
.my-message {
  align-items: flex-end;
}

.my-message .user-info {
  flex-direction: row-reverse;
  /* 名前とタイムスタンプの順序を反転 */
}

.my-message .message-bubble {
  background-color: #007ACC;
  border-top-right-radius: 4px;
}

/* ========== 入退室ログ ========== */
.log-message {
  text-align: center;
  margin: 8px 0;
  color: #94A3B8;
}

.log-message .timestamp {
  margin-left: 8px;
  font-size: 0.75rem;
}

/* ========== PiP用スタイル調整 ========== */
.pipWrapper .log-message,
.pipWrapper .message-item {
  margin-bottom: 8px; /* PiPでは少し詰める */
}
.pipWrapper .log-message {
  font-size: 0.9em;
}


/* ========== 以下、既存のスタイル ========== */
.link {
  text-decoration: none;
}

.area {
  width: 500px;
  border: 0;
  background-color: #3a3a3a;
  /* 背景に合わせて変更 */
  color: #E0E0E0;
  border-radius: 5px;
  padding: 8px;
}

.area:focus {
  outline: 3px solid #007FD4;
}

.button-exit {
  color: #000;
  margin-top: 8px;
}

.pipWrapper {
  background-color: #1E1E1E;
  color: #E0E0E0;
  height: 100%;
  max-height: 100%;
}

.pipFlexLayout {
  display: flex;
  flex-direction: column;
  height: calc(100% - 40px);
  min-height: 0;
}

.message-container {
  flex: 1 1 auto;
  overflow-y: auto;
  flex-direction: column;
  justify-content: flex-end;
  min-height: 0;
}

.pipInputArea {
  width: 100vw;
  position: relative;
}

.slider {
  -webkit-appearance: none;
  appearance: none;
  width: 120px;
  height: 6px;
  background: #555;
  outline: none;
  border-radius: 3px;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  background: #ffffff;
  border: 2px solid #888888;
  border-radius: 50%;
  cursor: pointer;
}

.slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  background: #ffffff;
  border: 2px solid #888888;
  border-radius: 50%;
  cursor: pointer;
}

.input-row {
  margin-top: 1em;
  display: flex;
  align-items: end;
  gap: 8px;
}

.inpArea {
  width: calc(100% - 120px);
  border: 0;
  background-color: #3a3a3a;
  color: #E0E0E0;
  border-radius: 5px;
  min-width: 0;
}

.inpArea:focus {
  outline: 3px solid #007FD4;
}

.send-btn {
  display: flex;
  align-items: center;
}

.btn-vert {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.float-btn {
  position: fixed;
  bottom: 16px;
  right: 16px;
  z-index: 1000;
  height: 70px !important;
  width: 70px !important;
  border-radius: 100px;
  font-size: 1.5em;
  color: white;
}

.float-btn:hover {
  transform: scale(1.1);
}
</style>

<style>
/* Markdownコンテンツのスタイル（グローバル） */
.markdown-body {
  line-height: 1.6;
  color: #E0E0E0;
}

.markdown-body a {
  color: #58a6ff;
}

.markdown-body p {
  margin: 0.5em 0;
}

.markdown-body h1,
.markdown-body h2,
.markdown-body h3,
.markdown-body h4,
.markdown-body h5,
.markdown-body h6 {
  margin: 1em 0 0.5em 0;
  font-weight: bold;
  border-bottom: 1px solid #444;
  padding-bottom: .3em;
}

.markdown-body ul,
.markdown-body ol {
  padding-left: 2em;
}

.markdown-body li {
  margin: 0.2em 0;
}

/* 引用ブロック */
.markdown-body blockquote {
  border-left: 3px solid #4a4a4a;
  padding-left: 1em;
  color: #b0b0b0;
  margin: 0.5em 0;
  background-color: #2a2a2a;
}

/* コードブロック */
.markdown-body pre {
  background-color: #2a2a2a;
  padding: 1em;
  overflow-x: auto;
  border-radius: 6px;
}

/* インラインコード */
.markdown-body code {
  background-color: #2a2a2a;
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-family: monospace;
}

.markdown-body pre code {
  padding: 0;
  background-color: transparent;
}

/* テーブル */
.markdown-body table {
  border-collapse: collapse;
  margin: 1em 0;
  display: block;
  overflow: auto;
}

.markdown-body th,
.markdown-body td {
  border: 1px solid #444;
  padding: 0.5em 0.8em;
}

.markdown-body tr {
  background-color: #1E1E1E;
  border-top: 1px solid #444;
}

.markdown-body tr:nth-child(2n) {
  background-color: #2a2a2a;
}

.markdown-body th {
  font-weight: bold;
  background-color: #30363d;
}
</style>