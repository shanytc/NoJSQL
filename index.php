<html>
	<head>
		<link rel="stylesheet" href="main.css" type="text/css"/>
		<script type="text/javascript" src="jquery-1.7.2.min"></script>
		<script type="text/javascript" src="nosql.engine.js"></script>
		<script type="text/javascript" src="db.js"></script>
	</head>
	<body>
		
		<div id="main">
			<h1>NoJSQL Engine</h1>
			<script>
			
			$(function() {
				nsql.setDB(nosql_data);
				results = nsql.getFieldsBySql("select id,age,address from persons order by id asc");
				$.each(results, function(index, val) {
					console.log(val);
				});
			});

			</script>

		</div>

	</body>

</html>