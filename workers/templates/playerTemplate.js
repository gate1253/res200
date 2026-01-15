export function getPlayerHtml(target) {
    return `
<!DOCTYPE html> 
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>Play Content</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<script defer src="/malgnPlayer.js"></script>
<script>
window.onload = function () {
	malgnPlayer.setup({
	targetID: "player",
	video: {
		primaryKey: "Gate1253", 
		title: "Gate1253", 
		thumbnail: "/logo.jpg",
		source: "${target}"
	}
	});
};
</script>
</head>
<body style="background-color: white">
  <div id="player" style="width: 100%; height: 100%"></div>
</body>
</html>`;
}
