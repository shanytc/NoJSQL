<html>
	<head>
		<link rel="stylesheet" href="main.css" type="text/css"/>
		<script type="text/javascript" src="nosql.engine.js"></script>
		<script type="text/javascript" src="db.js"></script>
	</head>
	<body>
		
		<div id="main">
			
			<script>
			
			nsql.setDB(nosql_data);
			results = nsql.getFieldsBySql("select id, first_name, age from tbl_persons");
			console.log( results )


			</script>

		</div>

	</body>

</html>