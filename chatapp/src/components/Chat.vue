<script setup>
import { inject, ref, reactive, onMounted, useTemplateRef, computed } from "vue" // computed追加
import socketManager from '../socketManager.js'
import { marked } from "marked"

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
}

// サーバから受信した退室メッセージを受け取り画面上に表示する
const onReceiveExit = (data) => {
  chatList.unshift(data)
}

// サーバから受信した投稿メッセージを画面上に表示する
const onReceivePublish = (data) => {
  chatList.unshift(data)
}
// #endregion

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
  <div class="mx-auto my-5 px-4">
    <h1 class="text-h3 font-weight-medium">Vue.js Chat チャットルーム</h1>
    <div class="mt-10">
      <p>ログインユーザ：{{ userName }}</p>
      <textarea variant="outlined" placeholder="投稿文を入力してください" rows="4" class="area" v-model="chatContent"
        @keydown.enter="onPublish"></textarea>
      <div class="mt-5">
        <button class="button-normal" @click="onPublish">投稿</button>
        <button class="button-normal util-ml-8px" @click="onMemo">メモ</button>
      </div>
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
            <span v-if="chat.type === 'publish'">
              {{ chat.name }}：
              <span v-html="chat.content"></span>
            </span>
            <span v-if="chat.type === 'memo'">
              {{ chat.name }}のメモ：{{ chat.content }}
            </span>
          </li>
        </ul>
      </div>
    </div>
    <router-link to="/" class="link">
      <button type="button" class="button-normal button-exit" @click="onExit">退室する</button>
    </router-link>
  </div>
  <button class="button-normal" @click="openPip">Picture-in-Picture Open</button>

  <div ref="pipRef" class="mx-auto my-5 px-4 pipWrapper" @mouseover="onPipOver" @mouseout="onPipOut" v-show="pipStatus">
    <div class="pipFlex">
      <h1 class="text-h3 font-weight-medium">Vue.js Chat チャットルーム</h1>
      <div class="mt-5" v-if="chatList.length !== 0" :style="{ fontSize: pipFontSize + 'px' }">
        <ul>
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
              <span v-html="chat.content"></span>
            </span>
            <span v-if="chat.type === 'memo'">
              {{ chat.name }}のメモ：{{ chat.content }}
            </span>
          </li>
        </ul>
      </div>
      <div class="pipInputArea" v-show="mouseoverPip">
        <p>ログインユーザ：{{ userName }}さん</p>
        <textarea variant="outlined" placeholder="投稿文を入力してください" rows="2" class="area" v-model="chatContent"
          @keydown.enter="onPublish"></textarea>
        <div class="mt-5">
          <button class="button-normal" @click="onPublish">投稿</button>
          <button class="button-normal util-ml-8px" @click="onMemo">メモ</button>
        </div>
      </div>
    </div>
    <div class="font-slider-container">
      <input type="range" min="10" max="24" v-model="pipFontSize" class="slider">
    </div>
  </div>
</template>

<style scoped>
.link {
  text-decoration: none;
}

.area {
  width: 500px;
  border: 1px solid #000;
  margin-top: 8px;
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
  height: 100%;
  position: relative;
}

.pipFlex {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.my-message {
  background-color: lightyellow;
  padding: 8px;
  border-radius: 4px;
}

/* スライダーを配置するためのコンテナ */
.font-slider-container {
  position: absolute;
  top: 20px;    /* 上からの位置 */
  right: 20px;  /* 右からの位置 */
  z-index: 10;  /* 他の要素より手前に表示 */
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
</style>