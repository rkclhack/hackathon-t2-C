<script setup>
import { inject, ref, reactive, onMounted, useTemplateRef } from "vue"
import socketManager from '../socketManager.js'
import PiP from "./PiP.vue"

// #region global state
const userName = inject("userName")
// #endregion

// #region local variable
const socket = socketManager.getInstance()
// #endregion

// #region reactive variable
const chatContent = ref("")
const chatList = reactive([])
// #endregion

// #region lifecycle
onMounted(() => {
  registerSocketEvent()
})
// #endregion

const publish = (chatContent) => {
  // 入力内容の前後の空白を削除
  const message = chatContent.trim()

  // メッセージが空文字でなければ、サーバーに送信する
  if (message) {
    socket.emit("publishEvent", {
      type: "publish",
      name: userName,
      content: message,
      datetime: Date.now()
    })
  }
}

const exit = () => {
  socket.emit("exitEvent", {
    type: "exit",
    name: userName.value,
    datetime: Date.now()
  })
}

const memo = (chatContent) => {
  // メモの内容を表示
  chatList.unshift({
    type: "memo",
    name: userName.value,
    content: chatContent,
    datetime: Date.now()
  })
}

// #region browser event handler
// 投稿メッセージをサーバに送信する
const onPublish = (event) => {
  // Ctrl + Enter で送信
  if (event instanceof KeyboardEvent && !event.ctrlKey) return;

  publish(chatContent.value)

  // 入力欄を初期化
  chatContent.value = ""  
}

// 退室メッセージをサーバに送信する
const onExit = () => {
  exit()
}

// メモを画面上に表示する
const onMemo = () => {
  memo(chatContent.value)

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
}
// #endregion

const pipRef = useTemplateRef("pipRef")
const openPip = async () => {
  const pipWindow = await window.documentPictureInPicture.requestWindow({
  });
  pipWindow.document.body.append(pipRef.value);
}
</script>

<template>
  <div class="mx-auto my-5 px-4">
    <h1 class="text-h3 font-weight-medium">Vue.js Chat チャットルーム</h1>
    <div class="mt-10">
      <p>ログインユーザ：{{ userName }}さん</p>
      <textarea variant="outlined" placeholder="投稿文を入力してください" rows="4" class="area" v-model="chatContent" @keydown.enter="onPublish"></textarea>
      <div class="mt-5">
        <button class="button-normal" @click="onPublish">投稿</button>
        <button class="button-normal util-ml-8px" @click="onMemo">メモ</button>
      </div>
      <div class="mt-5" v-if="chatList.length !== 0">
        <ul>
          <li class="item mt-4" v-for="(chat, i) in chatList" :key="i">
            <span>[{{ new Date(chat.datetime).toLocaleString() }}]</span>
            <span v-if="chat.type === 'enter'">
              {{ chat.name }}が入室しました。
            </span>
            <span v-if="chat.type === 'exit'">
              {{ chat.name }}が退室しました。
            </span>
            <span v-if="chat.type === 'publish'">
              {{ chat.name }}：{{ chat.content }}
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

  <!-- Picture-in-Picture -->
  <div ref="pipRef">
    <PiP :chat-list="chatList" @on-publish="publish" @on-exit="exit" @on-memo="memo" />
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
</style>