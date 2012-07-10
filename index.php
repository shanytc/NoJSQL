<html>
	<head>
		<link rel="stylesheet" href="main.css" type="text/css"/>
		<script type="text/javascript" src="jquery-1.7.2.min"></script>
		<script type="text/javascript" src="nosql.engine.js"></script>
		<script type="text/javascript" src="db.js"></script>

		<script>
			$(function() {
				nsql.setDB(nosql_data);
				sql=$('#editor').val();
				results = nsql.getFieldsBySql(sql);
				console.log(results);
				formatResults(results);

				function formatResults(results){
					$('#results').html('');
					$('#results').append('<table cellspacing="0" cellpadding="0" id="db_results"></table>');
					$.each(results[0], function(index, val) {
						$("#db_results").append('<th>'+val+'</th>');
					});
					
					// show the results
					$.each(results[1], function(index, val) {
						$('#db_results').append('<tr></tr>');
						$.each(val, function(i, v) {
							$('#db_results tr:last').append('<td>'+v+'</td>');
						});
					});
				}

				$('#go').live('click',function(){
					sql=$('#editor').val();
					results = nsql.getFieldsBySql(sql);
					formatResults(results);
				});
			});
		</script>
	</head>
	<body>
		
		<div id="main">
			<h1>NoJSQL Engine</h1>
		</div>
		<div id="sqlEditor">
			<textarea id="editor" style="width:100%; height:120px;">SELECT id,age,address 
FROM persons 
ORDER BY id asc</textarea>
			<input type="button"  value="GO" id="go">
		</div>
		<div id="results"></div>
	</body>

</html>