// 履歴管理
const history = []

// 各メンバーの各状態
// "Active": 入室中
// "Inactive": 退室済み
// "Idle": 休憩中
const memberStatus = {}

// 部屋に入る
const enterRoom = (name) => {
  memberStatus[name] = "Active";
}

// 部屋に入る
const exitRoom = (name) => {
  memberStatus[name] = "Inactive";
}

const idleMemeber = (name) => {
  memberStatus[name] = "Idle";
}

const getMemberStatus = () => {
  return Object.entries(memberStatus)
}

export default (io, socket) => {
  // 入室メッセージをクライアントに送信する
  socket.on("enterEvent", (data) => {
    enterRoom(data.name);

    socket.broadcast.emit("enterEvent", data)
    history.push(data) // 履歴に追加
    socket.emit("historyEvent", history)  // 履歴を送信
  })

  // 退室メッセージをクライアントに送信する
  socket.on("exitEvent", (data) => {
    exitRoom(data.name);

    history.push(data) // 履歴に追加
    socket.broadcast.emit("exitEvent", data)
  })

  // 投稿メッセージを送信する
  socket.on("publishEvent", (data) => {
    history.push(data) // 履歴に追加
    io.sockets.emit("publishEvent", data)
  })

  // 投稿履歴をクライアントに送信する
  socket.on("historyEvent", () => {
    console.log("history", history)
    socket.emit("historyEvent", history)
  })

  // メンバー一覧を取得する
  socket.on("getMembersEvent", (data) => {
    socket.emit("getMembersEvent", getMemberStatus())
  })
}
