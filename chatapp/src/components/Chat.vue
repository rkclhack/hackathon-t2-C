<script setup>
import { inject, ref, reactive, onMounted, useTemplateRef, computed } from "vue" // coputed追加
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

<template><v-app class="app">
  <v-app-bar app color="black" dark>
    <v-btn icon @click="onExit" to="/">
      <v-icon>mdi-logout</v-icon>
    </v-btn>
    <v-toolbar-title>Vue.js Chat チャットルーム</v-toolbar-title>
    <p>ログインユーザ：{{ userName }}さん</p>
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

      <textarea variant="outlined" placeholder="投稿文を入力してください" rows="4" class="area" v-model="chatContent"
        @keydown.enter="onPublish"></textarea>
      <v-btn color="grey dark" style="margin-left: 5px;" @click="onPublish">
        <v-icon right>mdi-send</v-icon>
      </v-btn>

    </div>
  </div>

  <v-btn fixed bottom right color="black" dark @click="openPip">
    <v-icon>mdi-open-in-new</v-icon>
  </v-btn>

</v-app>


<!-- Picture-in-Picture -->
<div ref="pipRef" class="mx-auto my-5 px-4 pipWrapper" @mouseover="onPipOver" @mouseout="onPipOut" v-show="pipStatus">
  <div class="pipFlex">
    <div class="mt-5" v-if="chatList.length !== 0">
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
    <div class="pipInputArea" v-show="mouseoverPip" style="padding-bottom: 10px;">
      <textarea variant="outlined" placeholder="投稿文を入力してください" rows="2" class="area" v-model="chatContent"
        @keydown.enter="onPublish"></textarea>
      <v-btn color="grey dark" style="margin-left: 5px;" @click="onPublish">
        <v-icon right>mdi-send</v-icon>
      </v-btn>
    </div>
  </div>
</div>
</template>

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
  color: white
}

.pipFlex {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
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
</style>