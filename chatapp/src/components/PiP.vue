<script setup>
import { inject, ref, reactive, onMounted, useTemplateRef } from "vue"
import socketManager from '../socketManager.js'

// #region global state
const userName = inject("userName")
// #endregion

// #region reactive variable
const props = defineProps([
  "chatList",
])

const chatContent = ref("")
const chatList = props.chatList
// #endregion

const emits = defineEmits([
  "onExit",
  "onPublish",
  "onMemo",
])

// #region browser event handler
// 投稿メッセージをサーバに送信する
const onPublish = (event) => {
  emits("onPublish", chatContent.value)
}

// 退室メッセージをサーバに送信する
const onExit = () => {
  emits("onExit")
}

// メモを画面上に表示する
const onMemo = () => {
  emits("onMemo", chatContent.value)
}
// #endregion
</script>

<template>
  <div class="mx-auto my-5 px-4">
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
    <button type="button" class="button-normal button-exit" @click="onExit">退室する</button>
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