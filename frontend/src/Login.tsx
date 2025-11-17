export default function Login() {
  const handleLogin = () => {
    // ✅ Spotify 로그인 페이지로 이동 (백엔드 /login)
    window.location.href = "http://127.0.0.1:4000/login";
  };

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        color: "white",
      }}
    >
      
      <button
        onClick={handleLogin}
        style={{
          background: "#1DB954",
          color: "#fff",
          padding: "12px 24px",
          fontSize: 18,
          borderRadius: 30,
          border: "none",
          cursor: "pointer",
        }}
      >
        Spotify로 로그인
      </button>
    </div>
  );
}
