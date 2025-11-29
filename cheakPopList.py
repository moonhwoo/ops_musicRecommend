import requests
import json
import html

# 1) API URL
url = "https://charts-spotify-com-service.spotify.com/auth/v0/charts/regional-kr-daily/2025-11-23"




# 2) Authorization 헤더 (네가 Network 탭에서 복사한 거 그대로)
headers = {
    "Authorization": "Bearer BQDs_Infogi1vbMhpVMblX4J7xBGvIvl91ff3dQNnh2MYTNxVxOr3j1h_OUSYFu2ohY7Qpd3boMgNPOwNd6B70LDICFRS28GEfvcxp6g-JUm9rU4C7hnPwWa4k-u2JE5A-ZkxCvEgaLWqU7bGrv1KFIT0sKmZjweein0vb3ZhVasn93qt6rcDNwWvGEjvi4wkyrC2zRDmKcdMOiL4zdIhXiUcrRhzrOH3kVubYqeW05JECnqXAkBUEtK8Q9p_uMgbQrI"
 }
#Bearer BQDs_Infogi1vbMhpVMblX4J7xBGvIvl91ff3dQNnh2MYTNxVxOr3j1h_OUSYFu2ohY7Qpd3boMgNPOwNd6B70LDICFRS28GEfvcxp6g-JUm9rU4C7hnPwWa4k-u2JE5A-ZkxCvEgaLWqU7bGrv1KFIT0sKmZjweein0vb3ZhVasn93qt6rcDNwWvGEjvi4wkyrC2zRDmKcdMOiL4zdIhXiUcrRhzrOH3kVubYqeW05JECnqXAkBUEtK8Q9p_uMgbQrI
#Bearer BQBgKujBEo1k0WKSQILzZYz7SP_KDJZggakQsGQqQYZ6S4ISVTdrcNF60MUYgtRwH0dh-kSKglwaSVXBdQAv9hON8l2MENnpMniApuvKoht-Z9arGpaR2jq52NxtrXmgbxnE278huYH6ByibBV1eFkKauX7pI5ctMq4kKl6UYXQJ2vPTm3ctLV1xSHFpZfjeMa1y4n7jLsnw9SpW3INaGdaRX4b7hWztuyglKf8aEhG-_hTTYLCEkLpCXvNMD8aNVWos
# 3) JSON 가져오기
res = requests.get(url, headers=headers)
data = res.json()

entries = data["entries"]

rows = []
for item in entries:
    rank = item["chartEntryData"]["currentRank"]
    name = item["trackMetadata"]["trackName"]
    artists = ", ".join(a["name"] for a in item["trackMetadata"]["artists"])

    track_uri = item["trackMetadata"]["trackUri"]  # spotify:track:...
    track_id = track_uri.split(":")[-1]
    track_url = f"https://open.spotify.com/track/{track_id}"

    rows.append((rank, name, artists, track_url))

# 4) HTML 테이블 만들기
table_rows_html = "\n".join(
    f"<tr>"
    f"<td>{rank}</td>"
    f"<td>{html.escape(name)}</td>"
    f"<td>{html.escape(artists)}</td>"
    f"<td><a href='{track_url}' target='_blank'>▶ 재생</a></td>"
    f"</tr>"
    for rank, name, artists, track_url in rows
)

html_doc = f"""<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <title>Spotify Daily Top Songs - KR</title>
  <style>
    body {{ font-family: sans-serif; background:#111; color:#eee; }}
    table {{ border-collapse: collapse; width: 100%; }}
    th, td {{ border-bottom: 1px solid #444; padding: 8px; text-align: left; }}
    th {{ background:#222; }}
    a {{ color:#1db954; text-decoration:none; }}
    a:hover {{ text-decoration:underline; }}
  </style>
</head>
<body>
  <h1>Spotify Daily Top Songs – South Korea (2025-11-21)</h1>
  <table>
    <thead>
      <tr>
        <th>순위</th>
        <th>곡명</th>
        <th>아티스트</th>
        <th>링크</th>
      </tr>
    </thead>
    <tbody>
      {table_rows_html}
    </tbody>
  </table>
</body>
</html>
"""

with open("chart.html", "w", encoding="utf-8") as f:
    f.write(html_doc)

print("chart.html 생성 완료! 브라우저로 열어봐.")
