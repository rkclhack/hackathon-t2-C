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
  chatList.push({ type: "memo", name: userName.value, content: chatContent.value, datetime: Date.now() })

  // 入力欄を初期化
  chatContent.value = ""
}
// #endregion

// #region socket event handler
// サーバから受信した入室メッセージ画面上に表示する
const onReceiveEnter = (data) => {
  chatList.push(data)
  onUpdateChatList()
}

// サーバから受信した退室メッセージを受け取り画面上に表示する
const onReceiveExit = (data) => {
  chatList.push(data)
  onUpdateChatList()
}

// サーバから受信した投稿メッセージを画面上に表示する
const onReceivePublish = (data) => {
  chatList.push(data)
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
      chatList.push(chat)
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

<template><v-app class="app">
  <v-app-bar app color="black" dark>
    <v-btn icon @click="onExit" to="/">
      <v-icon>mdi-logout</v-icon>
    </v-btn>
    <v-toolbar-title>Vue.js Chat チャットルーム</v-toolbar-title>
    <p>ログインユーザ：{{ userName }}さん</p>
    <v-btn fixed bottom right color="white" @click="openPip">
      <v-icon>mdi-open-in-new</v-icon>
    </v-btn>
  </v-app-bar>


  <div class="mx-auto my-5 px-4 chat" style="padding-top: 10px; padding-bottom: 10px;">
    <div class="mt-10">
      <div class="mt-5" v-if="chatList.length !== 0">
        <ul>
          <li class="item mt-4" v-for="(chat, i) in chatList" :key="i"
            :class="{ 'my-message': (chat.type === 'publish' || chat.type === 'memo') && chat.name === userName }">
            <span>[{{ new Date(chat.datetime).toLocaleString() }}]</span>
            <span v-if="chat.type === 'enter'">
              {{ chat.name }}が入室しました。
            </span>
            <span v-if="chat.type === 'exit'">
              {{ chat.name }}が退室しました。
            </span>
            <div v-if="chat.type === 'publish'">
              {{ chat.name }}：
              <div class="markdown-body" v-html="chat.content"></div>
            </div>
            <span v-if="chat.type === 'memo'">
              {{ chat.name }}のメモ：{{ chat.content }}
            </span>
          </li>
        </ul>
      </div>

      <textarea variant="outlined" placeholder="投稿文を入力してください" rows="4" class="area" v-model="chatContent"
        @keydown.enter="onPublish"></textarea>
      <v-btn color="grey dark" style="margin-left: 5px;" @click="onPublish">
        <v-icon right>mdi-send</v-icon>
      </v-btn>
    </div>
  </div>

  <!-- Picture-in-Picture -->
  <div ref="pipRef" class="mx-auto px-4 pipWrapper" v-show="pipStatus">
    <div class="font-slider-container">
      <input type="range" min="10" max="24" v-model="pipFontSize" class="slider">
    </div>
    <div class="pipFlexLayout" @mouseover="onPipOver" @mouseout="onPipOut">
      <ul class="message-container" v-if="chatList.length !== 0" :style="{ fontSize: pipFontSize + 'px' }">
        <li class="item mt-4" v-for="(chat, i) in chatList" :key="i"
          :class="{ 'my-message': (chat.type === 'publish' || chat.type === 'memo') && chat.name === userName }">
          <span v-if="chat.type === 'enter'">
            {{ chat.name }}が入室しました。
          </span>
          <span v-if="chat.type === 'exit'">
            {{ chat.name }}が退室しました。
          </span>
          <span v-if="chat.type === 'publish'">
            {{ chat.name }}：
            <div class="markdown-body" v-html="chat.content"></div>
          </span>
          <span v-if="chat.type === 'memo'">
            {{ chat.name }}のメモ：{{ chat.content }}
          </span>
        </li>
      </ul>
      <div class="pipInputArea" v-show="mouseoverPip" style="padding-bottom: 10px;">
        <textarea variant="outlined" :placeholder="`ログインユーザ：${userName}`" rows="2" class="inpArea" v-model="chatContent"
          @keydown.enter="onPublish"></textarea>
        <v-btn color="grey dark" style="margin-left: 5px;" @click="onPublish">
          <v-icon right>mdi-send</v-icon>
        </v-btn>
      </div>
    </div>
  </div>
</v-app></template>

<style scoped>
.link {
  text-decoration: none;
}

.area {
  width: 500px;
  border: 3px solid #007FD4;
  margin-top: 8px;
  background-color: #9E9E9E;
  color: white;
  border-radius: 5px;
}

.item {
  display: block;
}

.util-ml-8px {
  margin-left: 8px;
}

.button-exit {
  color: #000;
  margin-top: 8px;
}

.pipWrapper {
  /*height: 100%;  */
  background-color: rgb(79, 79, 79);
  color: white;
  height: 100%;
  max-height: 100%;
}

.pipFlexLayout {
  display: flex;
  flex-direction: column;
  height: calc(100% - 40px);
  min-height: 0;
  /* position: relative; */
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

.my-message {
  background-color: lightyellow;
  color: black;
  padding: 8px;
  border-radius: 4px;
}

.app {
  background-color: rgb(79, 79, 79);
  color: white
}

/* スライダー本体のスタイル */
.slider {
  -webkit-appearance: none;
  appearance: none;
  width: 120px;
  height: 6px;
  background: #cccccc;
  outline: none;
  border-radius: 3px;
}

/* スライダーのつまみ（Chrome, Safari, Opera, Edge） */
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

/* スライダーのつまみ（Firefox） */
.slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  background: #ffffff;
  border: 2px solid #888888;
  border-radius: 50%;
  cursor: pointer;
}

.inpArea {
  width: 70vw;
  border: 3px solid #007FD4;
  margin-top: 8px;
  background-color: #9E9E9E;
  color: white;
  border-radius: 5px;
}

.app {
  background-color: rgb(79, 79, 79);
  color: white
}

/* スライダー本体のスタイル */
.slider {
  -webkit-appearance: none;
  appearance: none;
  width: 120px;
  height: 6px;
  background: #cccccc;
  outline: none;
  border-radius: 3px;
}

/* スライダーのつまみ（Chrome, Safari, Opera, Edge） */
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

/* スライダーのつまみ（Firefox） */
.slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  background: #ffffff;
  border: 2px solid #888888;
  border-radius: 50%;
  cursor: pointer;
}

.inpArea {
  width: 70vw;
  border: 3px solid #007FD4;
  margin-top: 8px;
  background-color: #9E9E9E;
  color: white;
  border-radius: 5px;
}
</style>

<style>
/* Markdownコンテンツのコンテナ */
.markdown-body {
  line-height: 1.6;
  padding-left: 8px; /* コンテナ全体に左パディングを追加 */
}

/* 段落 */
.markdown-body p {
  margin: 0.5em 0;
}

/* 見出し */
.markdown-body h1, .markdown-body h2, .markdown-body h3,
.markdown-body h4, .markdown-body h5, .markdown-body h6 {
  margin: 1em 0 0.5em 0;
  font-weight: bold;
}

/* リスト */
.markdown-body ul, .markdown-body ol {
  padding-left: 8px;
  /*margin: 0.5em 0;*/
  /*list-style-position: inside;*/ /* 行頭記号を要素のボックス内に配置 */
}

.markdown-body li {
  margin: 0.2em 0;
}

/* 引用ブロック */
.markdown-body blockquote {
  border-left: 3px solid #ccc;
  padding-left: 1em;
  color: #666;
  margin: 0.5em 0;
}

/* コードブロック */
.markdown-body pre {
  background-color: #f5f5f5;
  padding: 0.5em;
  overflow-x: auto;
}

/* インラインコード */
.markdown-body code {
  background-color: #f0f0f0;
  padding: 0.1em 0.3em;
  border-radius: 3px;
}

/* テーブル */
.markdown-body table {
  border-collapse: collapse;
  margin: 0.5em 0;
}
.markdown-body th, .markdown-body td {
  border: 1px solid #ccc;
  padding: 0.3em 0.5em;
}
</style>
