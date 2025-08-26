// 履歴管理
const history = []

export default (io, socket) => {
  // 入室メッセージをクライアントに送信する
  socket.on("enterEvent", (data) => {
    socket.broadcast.emit("enterEvent", data)
    history.push(data) // 履歴に追加
    socket.emit("historyEvent", history)  // 履歴を送信
  })

  // 退室メッセージをクライアントに送信する
  socket.on("exitEvent", (data) => {
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
}