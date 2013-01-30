var levels = ['L', 'M', 'Q', 'H'];

var source = '';
var errorCorrectionLevel = 'L';
var encoder = null;

$(document).ready(function(e) {
	$("#eclslider").bind("change", function(event) {
		var eclslider = $(event.target);
		var v = eclslider.val();
		var red = (v * 3).toString(16);
		var green = (12 - red).toString(16);
		eclslider.css('background-image', '-webkit-linear-gradient(top, white, #' + red + green + '0, white)');
		
		errorCorrectionLevel = levels[eclslider.value];	
		encoder = QREncoder(source, errorCorrectionLevel);
		encoder.show($("#qrimage"));	
	});
	
	chrome.tabs.getSelected(null, function(tab){
		source = tab.url;
		errorCorrectionLevel = $("#ecl").val();
		encoder = QREncoder(source, errorCorrectionLevel);
		encoder.show($("#qrimage"));
	});
});