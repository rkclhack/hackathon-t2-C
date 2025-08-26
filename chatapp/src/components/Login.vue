<script setup>
import { inject, ref } from "vue"
import { useRouter } from "vue-router"
import socketManager from '../socketManager.js'

// #region global state
const userName = inject("userName")
// #endregion

// #region local variable
const router = useRouter()
const socket = socketManager.getInstance()
// #endregion

// #region reactive variable
const inputUserName = ref("")
// #endregion

// #region browser event handler
// 入室メッセージをクライアントに送信する
const onEnter = () => {
  // ユーザー名が入力されているかチェック
  if (inputUserName.value === "") {
    alert("ユーザー名を入力してください")
    return
  }
  // 入室メッセージを送信
  socket.emit("enterEvent", {
    type: "enter",
    name: inputUserName.value,
    datetime: Date.now()
  })
  // 全体で使用するnameに入力されたユーザー名を格納
  userName.value = inputUserName.value
  // チャット画面へ遷移
  router.push({ name: "chat" })
}
// #endregion
</script>

<template>
  <div class="login-container">
    <div class="login-form">
      <h1 class="login-title">Vue.js Chat サンプル</h1>
      <div class="input-group">
        <label for="username">ユーザー名</label>
        <input type="text" id="username" class="input-field" v-model="inputUserName" @keyup.enter="onEnter" />
      </div>
      <button type="button" @click="onEnter" class="login-button">入室する</button>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #1E1E1E;
  font-family: sans-serif;
}

.login-form {
  background-color: #24292e;
  padding: 32px;
  border-radius: 8px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  width: 320px;
}

.login-title {
  color: #f8fafc;
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 24px;
  text-align: center;
}

.input-group {
  margin-bottom: 24px;
}

.input-group label {
  display: block;
  color: #cbd5e1;
  font-size: 14px;
  margin-bottom: 8px;
}

.input-field {
  width: 100%;
  padding: 10px;
  border: 1px solid #484f58;
  border-radius: 4px;
  background-color: #30363d;
  color: #f8fafc;
  font-size: 16px;
  box-sizing: border-box;
  transition: border-color 0.3s, box-shadow 0.3s;
}

.input-field:focus {
  outline: none;
  border-color: #38bdf8;
  box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.4);
}

.login-button {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 4px;
  background-color: #007ACC;
  color: #f8fafc;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.login-button:hover {
  background-color: #005F9E;
}
</style>