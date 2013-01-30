var QREncoder = function(source, level) {
	this.mode = 'Bytes';
	this.errorCorrectionLevel = 'L';
	this.dataMaskingPattern = "000";
	this.source = source;
	
	if(level && ErrorCorrectionLevelIndicators[level.toUpperCase()])
		this.errorCorrectionLevel = level.toUpperCase();
	
	var eclIndex = ['L', 'M', 'Q', 'H'].indexOf(this.errorCorrectionLevel);
	var ecl = null;
	var datas = null; // 二维数组.元素均为包含两个属性的对象{mType:'0', v:0},其中:mType代表图形类型,v取值0或1
	var v = null;
	var element = null;
	var finalDataArray = null;
	
	
	// 分析数据,设置QR的模式和版本
	function dataAnalysis() {
		for(var i in QR.vl) {
			if(QR.vl[i].ecl[eclIndex].modes[this.mode] >= this.source.length) {
				v = QR.vl[i];
				ecl = v.ecl[eclIndex];
				break;
			}
		}
	}		
	
	// 初始化工作
	function init() {
		initDatas();
		initTable();
	}
	
	// 初始化数据模型
	function initDatas() {
		datas = new Array(v.width);
		for(var rowIndex = 0; rowIndex < v.width; rowIndex++) {
			datas[rowIndex] = new Array(v.width);
			for(var colIndex = 0; colIndex < v.width; colIndex++) {
				datas[rowIndex][colIndex] = {v:0};
			}
		}
	}
	
	// 初始化表格,待程序填充
	function initTable() {
		element = $("<table cellspacing='0' class='qr'></table>");
		
		for(var i = 0; i < v.width; i++) {
			var row = $("<tr>");
			for(j = 0; j < v.width; j++){
				$("<td>").appendTo(row);
			}
			row.appendTo(element);
		}
	}
	
	// 根据版本,标记每个点所属的图形类型.注意有些次序不能乱
	/*
		'0': '位置探测图形'
		, '1': '位置探测图形分隔符'
		, '2': '定位图形'
		, '3': '校正图形'
		, '4': '格式信息'
		, '5': '版本信息'
		, '6': '数据和纠错码'
	*/
	function markModulesWithModuleType() {
		// 标记位置探测图形
		for(var i = 0; i < 7; i++) {
			for(var j = 0; j < 7; j++) {
				datas[i][j].mType = '0';
				datas[i][v.width - j - 1].mType = '0';
				datas[v.width - 1 - i][j].mType = '0';
			}
		}
		
		// 位置探测图形分隔符
		for(var i = 0; i < 8; i++) {
			datas[7][i].mType = '1';
			datas[7][v.width - 1 - i].mType = '1';
			datas[v.width - 1 - 7][i].mType = '1';
			
			datas[i][7].mType = '1';
			datas[v.width - 1 - i][7].mType = '1';
			datas[i][v.width - 1 - 7].mType = '1';
		}
		
		// 定位图形
		for(var i = 8; i <= v.width - 1 - 8; i++) {
			datas[6][i].mType = '2';
			datas[i][6].mType = '2';
		}

		// 格式信息
		for(var i = 0; i < 8; i++) {
			datas[8][i].mType = '4';
			datas[8][v.width - 1 - i].mType = '4';
			datas[i][8].mType = '4';
			datas[v.width - 1 - i][8].mType = '4';
		}
		datas[8][8].mType = '4';
		datas[8][6].mType = '2';
		datas[6][8].mType = '2';

		// 校正图形
		if(v.coordinatesOfCenterModule && v.coordinatesOfCenterModule.length > 1) {
			var len = v.coordinatesOfCenterModule.length;
			var rownum = 0;
			var colnum = 0;
			
			for(var i = 1; i < len - 1; i++) {
				rownum = v.coordinatesOfCenterModule[0]; // 第0行
				colnum = v.coordinatesOfCenterModule[i]; // 第1 - (len-2)列
				
				for(var p = -2; p < 3; p++)
					for(var q = -2; q < 3; q++)
						datas[rownum + p][colnum + q].mType = '3';
			}
			
			for(var i = 1; i < len - 1; i++) {
				for(var j = 0; j < len; j++) {
					rownum = v.coordinatesOfCenterModule[i]; // 第1 - (len-2)行
					colnum = v.coordinatesOfCenterModule[j]; // 第0 - (len-1)列
					
					for(var p = -2; p < 3; p++)
						for(var q = -2; q < 3; q++)
							datas[rownum + p][colnum + q].mType = '3';
				}
			}
			
			for(var i = 1; i < len; i++) {
				rownum = v.coordinatesOfCenterModule[len - 1]; // 第(len-1)行
				colnum = v.coordinatesOfCenterModule[i]; // 第1 - (len-1)列
				
				for(var p = -2; p < 3; p++)
						for(var q = -2; q < 3; q++)
							datas[rownum + p][colnum + q].mType = '3';
			}
		}
		
		// 版本信息
		if(v.v >= 7) {
			for(var i = 0; i < 3; i++) {
				for(var j = 0; j <6; j++) {
					datas[j][v.width - 1 - 8 - i].mType = '5';
					datas[v.width - 1 - 8 - i][j].mType = '5';
				}
			}
		}
	}

	// 绘制功能图形
	function drawFunctionPatterns() {
		// 位置探测图形
		// 0-7 留白
		for(var i = 0; i < 7; i++) {
			for(var j = 0; j < 7; j++) {
				if((Math.abs(i-3) != 2 || Math.abs(j-3) > 2) && (Math.abs(j-3) != 2 || Math.abs(i-3) > 2)) {
					datas[i][j].v = 1;
					datas[v.width - 1 - i][j].v = 1;
					datas[i][v.width - 1 - j].v = 1;
				}
			}
		}
		
		// 位置探测图形分隔符
		for(var i = 0; i < 8; i++) {
			datas[7][i].v = '0';
			datas[7][v.width - 1 - 7].v = '0';
			datas[v.width - 1 - 7][i].v = '0';
			
			datas[i][7].v = '0';
			datas[v.width - 1 - 7][7].v = '0';
			datas[i][v.width - 1 - 7].v = '0';
		}			
		
		// 定位图形
		for(var i = 8; i <= v.width - 1 - 8; i++) {
			if((6+i) % 2 == 0) {
				datas[6][i].v = 1;
				datas[i][6].v = 1;
			}
		}
		
		// 校正图形
		if(v.coordinatesOfCenterModule && v.coordinatesOfCenterModule.length > 1) {
			var len = v.coordinatesOfCenterModule.length;
			var rownum = 0;
			var colnum = 0;
			
			for(var i = 1; i < len - 1; i++) {
				rownum = v.coordinatesOfCenterModule[0]; // 第0行
				colnum = v.coordinatesOfCenterModule[i]; // 第1 - (len-2)列
				
				for(var p = -2; p < 3; p++)
					for(var q = -2; q < 3; q++) {
						var distance = p * p + q * q;
						if( distance == 0  || distance >= 4)
							datas[rownum + p][colnum + q].v = 1;
					}
			}
			
			for(var i = 1; i < len - 1; i++) {
				for(var j = 0; j < len; j++) {
					rownum = v.coordinatesOfCenterModule[i]; // 第1 - (len-2)行
					colnum = v.coordinatesOfCenterModule[j]; // 第0 - (len-1)列
					
					for(var p = -2; p < 3; p++)
						for(var q = -2; q < 3; q++) {
							var distance = p * p + q * q;
							if( distance == 0  || distance >= 4)
								datas[rownum + p][colnum + q].v = 1;
						}
				}
			}
			
			for(var i = 1; i < len; i++) {
				rownum = v.coordinatesOfCenterModule[len - 1]; // 第(len-1)行
				colnum = v.coordinatesOfCenterModule[i]; // 第1 - (len-1)列
				
				for(var p = -2; p < 3; p++)
					for(var q = -2; q < 3; q++) {
						var distance = p * p + q * q;
						if( distance == 0  || distance >= 4)
							datas[rownum + p][colnum + q].v = 1;
					}
			}
		}	
	}	
	
	// 编码
	function encoding() {
		// 模式指示符
		var mi = ModeIndicators[this.mode].code; 
		
		// 字符串长度指示符
		var cci = ''; 
		cci = paddingLeft(this.source.length.toString(2), '0', caclCharacterCountBits(v.v, this.mode));
		
		// 数据
		var datasequence = '';
		if (this.mode == 'Bytes') {
			for(var i = 0; i < this.source.length; i++) {
				datasequence += paddingLeft(source.charCodeAt(i).toString(2), '0', 8);
			}
		}
		
		// 终止符
		var terminator = '';
		var t = (mi.length + cci.length + datasequence.length) % 8;
		if (t != 0) terminator = paddingLeft('', '0', 8 - t);
		
		// 填充字符
		var extend = '';
		t = ecl.numberOfDataCodewords * 8;
		t = t - (mi.length + cci.length + datasequence.length + terminator.length);
		while(t >= 16) {
			extend += '11101100' + '00010001';
			t -= 16;
		}
		if (t == 8) extend += '11101100';
		
		var blockNum = ecl.blocks[0] + ecl.blocks[1];
		var blockSize = Math.floor(ecl.numberOfDataCodewords / blockNum);  // 数据被分块后的每块大小,以字节为单位
		var errorCorrectionBlockSize = ecl.numberOfErrorCorrectionCodewords / blockNum;
		var gp = GeneratorPolynomials[errorCorrectionBlockSize + ''];
		
		var allData = mi + cci + datasequence + terminator + extend;
		var allDataArray = new Array(ecl.numberOfDataCodewords);
		for(var i = 0; i < ecl.numberOfDataCodewords; i++) {
			allDataArray[i] = allData.substr(i * 8, 8);
		}
		
		// 纠错码
		var pointer = 0;
		var errorCorrectionCodes = ''; // 纠错码数据
		for(var i = 0; i < blockNum; i++) {
			var sublen = i < ecl.blocks[0] ? blockSize : blockSize + 1;
			var blockData = allDataArray.slice(pointer, pointer+ sublen);
			errorCorrectionCodes += galois(blockData, gp);
			pointer += sublen;
		}
		
		var errorCorrectionCodesArray = new Array(errorCorrectionBlockSize * blockNum);
		for(var i = 0; i < errorCorrectionBlockSize * blockNum; i++) {
			errorCorrectionCodesArray[i] = errorCorrectionCodes.substr(i * 8, 8);
		}
		
		// 最终数据
		finalDataArray = new Array(v.dc);
		pointer = 0;
		for(var i = 0; i < blockSize; i++) {
			for(var j = 0; j < blockNum; j++) {
				finalDataArray[pointer] = allDataArray[i + j * blockSize];
				pointer += 1;
			}
		}
		for(var i = 0; i < ecl.blocks[1]; i++) {
			finalDataArray[pointer] = allDataArray[(ecl.blocks[0] + i) * blockSize];
			pointer += 1;
		}
		for(var i = 0; i < errorCorrectionBlockSize; i++) {
			for(var j = 0; j < blockNum; j++) {
				finalDataArray[pointer] = errorCorrectionCodesArray[i + j * errorCorrectionBlockSize];
				pointer += 1;
			}
		}
	}
	
	// 绘制数据区域
	function drawEncodingRegion() {
		var startIndex = v.width - 1; 
		var step = -1;
		var dataIndex = 0;
		var tempData = null;
		for(var colIndex = v.width - 1; colIndex >= 0; colIndex = colIndex - 2) {
			if(colIndex == 6) colIndex = colIndex - 1; // 定位图形,跳过
			
			var rowIndex = startIndex;
			while(rowIndex >= 0 && rowIndex < v.width) {
				if(typeof(datas[rowIndex][colIndex].mType) == 'undefined' || datas[rowIndex][colIndex].mType == '6') {
					datas[rowIndex][colIndex].mType = '6';
					
					if(dataIndex < finalDataArray.length * 8) {
						datas[rowIndex][colIndex].v = finalDataArray[Math.floor(dataIndex / 8)].substr(dataIndex % 8, 1);
						dataIndex++;
					} else {
						datas[rowIndex][colIndex].v = '0';
					}
				}
				if(typeof(datas[rowIndex][colIndex - 1].mType) == 'undefined' || datas[rowIndex][colIndex - 1].mType == '6' ) {
					datas[rowIndex][colIndex - 1].mType = '6';
					
					if(dataIndex < finalDataArray.length * 8) {
						datas[rowIndex][colIndex - 1].v = finalDataArray[Math.floor(dataIndex / 8)].substr(dataIndex % 8, 1);
						dataIndex++;	
					} else {
						datas[rowIndex][colIndex].v = '0';
					}
				}
				
				rowIndex += step;
			}
			
			startIndex = rowIndex - step;
			step = 0 - step;
		}
	}		
	
	// 掩码
	function masking() {
		for(var rowIndex = 0; rowIndex < v.width; rowIndex++) {
			for(var colIndex = 0; colIndex < v.width; colIndex++) {
				var o = datas[rowIndex][colIndex];
				if(o.mType == '6' && MaskingPatterns[this.dataMaskingPattern](rowIndex, colIndex)) {
					o.v = o.v ^ 1;
				}
			}
		}
	}
	
	var formatInformation = ''; // 格式信息
	var versionInformation = ''; // 版本信息
	// 绘制格式及版本信息
	function drawFormatAndVersionInformation() {
		var fi = ErrorCorrectionLevelIndicators[this.errorCorrectionLevel] + this.dataMaskingPattern;
		fi = bch(fi,FECGP);
		fi = parseInt(fi, 2) ^ FECMC; // 101010000010010
		fi = paddingLeft(fi.toString(2), '0', 15);
		formatInformation = fi;
		
		for(var i = 0; i < 6; i++) {
			datas[8][v.width - 1 - i].v = formatInformation.charAt(14 - i);
			datas[8][i].v = formatInformation.charAt(i);
			datas[i][8].v = formatInformation.charAt(14 - i);
			datas[v.width - 1 - i][8].v = formatInformation.charAt(i);
		}
		
		datas[8][7].v = formatInformation.charAt(14 - 8);
		datas[8][8].v = formatInformation.charAt(14 - 7);
		datas[7][8].v = formatInformation.charAt(14 - 6);
		datas[8][v.width - 1 - 6].v = formatInformation.charAt(14 - 6);
		datas[8][v.width - 1 - 7].v = formatInformation.charAt(14 - 7);
		datas[v.width - 1 - 6][8].v = formatInformation.charAt(14 - 8);
		datas[v.width - 1 - 7][8].v = '1';
		
		
		if(v.v >= 7) {
			var vi = v.v;
			vi = paddingLeft((vi * 1).toString(2), '0', '6');
			vi = bch(vi,VECGP);
			versionInformation = vi;
			
			for(var i = 0; i < 3; i++) {
				for(var j = 0; j < 6; j++) {
					datas[v.width - 1 - 10 + i][j].v = versionInformation.charAt(17 - (i + j * 3));
					datas[j][v.width - 1 - 10 + i].v = versionInformation.charAt(17 - (i + j * 3));
				}
			}
		}
	}
	
	// BCH
	function bch(source, gx) {
		var gxArray = polynomial2Array(gx);
		var sourceLength = source.length;
		var number = parseInt(source, 2);
		var numberBitLength = number.toString(2).length;
		
		var sourcePower = numberBitLength - 1;
		var power = gxArray[0].power;
		
		var flag = Math.pow(2, power);
		var append = number * flag;
		var t = 0;
		for(var i in gxArray) t += Math.pow(2, gxArray[i].power);
		while(append >= flag) { 
			append = append ^ (t * Math.pow(2, sourcePower));
			sourcePower = append.toString(2).length - power - 1;
		}
		
		source += paddingLeft(append.toString(2), '0', sourceLength * 2);
		source = paddingLeft(source, '0', sourceLength * 3);
		
		return source;
	}
	
	function render() {
		var dataIndex = 0;
		for(var rowIndex = 0; rowIndex < v.width; rowIndex++) {
			for(var colIndex = 0; colIndex < v.width; colIndex++) {
				var clsName = datas[rowIndex][colIndex].v == '1' ? 'dark' : 'light';
				element.find("td:eq(" + dataIndex + ")").addClass(clsName).prop('mType', datas[rowIndex][colIndex].mType);
				dataIndex++;
			}
		}
	}
	
	// 展示
	this.show = function(appendTo) {
		dataAnalysis();
		init();
		markModulesWithModuleType();
		drawFunctionPatterns();
		encoding();
		drawEncodingRegion();
		masking();
		drawFormatAndVersionInformation();
		render();
		
		appendTo.children().remove();
		element.appendTo(appendTo);	
		appendTo.css('width', (element.height() + 34) +'px').css('height', (element.height() + 34) +'px');
	}
	
	
	return this;
};



// 纠错等级指示符
var ErrorCorrectionLevelIndicators = { 'L':'01', 'M':'00', 'Q':'11', 'H':'10'};
var FECGP = 'x10+x8+x5+x4+x2+x1+1'; // 格式信息多项式
var FECMC = 21522; // 二进制101010000010010
var VECGP = 'x12+x11+x10+x9+x8+x5+x2+1';	// 版本信息多项式

// 掩模图形公式
var MaskingPatterns = {
	'000': function(i, j) {return  (i + j) % 2 == 0;}
}

// Number of bits in character count indicator for QR Code 2005
// 字符计数指示符的位数
var NBCCI = {
	'M1': {
		'Numeric': 3
		, 'Alphanumeric': NaN
		, 'Bytes': NaN
		, 'Kanji': NaN
	}, 'M2': {
		'Numeric': 4
		, 'Alphanumeric': 3
		, 'Bytes': NaN
		, 'Kanji': NaN
	}, 'M3': {
		'Numeric': 5
		, 'Alphanumeric': 4
		, 'Bytes': 4
		, 'Kanji': 3
	}, 'M4': {
		'Numeric': 6
		, 'Alphanumeric': 5
		, 'Bytes': 5
		, 'Kanji': 4
	}, '1-9': {
		'Numeric': 10
		, 'Alphanumeric': 9
		, 'Bytes': 8
		, 'Kanji': 8
	}, '10-26': {
		'Numeric': 12
		, 'Alphanumeric': 11
		, 'Bytes': 16
		, 'Kanji': 10
	}, '27-40': {
		'Numeric': 14
		, 'Alphanumeric': 13
		, 'Bytes': 16
		, 'Kanji': 12
	}
}

// Mode indicators for QR Code 2005
// 模式指示符
var ModeIndicators = {
		'ECI': {'code':'0111', 'desc':'ECI'}
		, 'Numeric': {'code':'0001', 'desc':'数字0-9', 'len': {'3':10, '2':7, '1':4}}
		, 'Alphanumeric': {'code':'0010', 'desc':'字符数字0-9A-Zspace$%*+-./:', 'len': {'2':13, '1':7}}
		, 'Bytes': {'code':'0100', 'desc':'8位字节'}
		, 'Kanji': {'code':'1000', 'desc':'日文汉字'}
		, 'Structured Append': {'code':'0011', 'desc':'Structured Append'}
		, 'FNC1': { 'code':'0101,1001', 'desc':'FNC1'}
		, 'Terminator': {'code':'0000', 'desc':'Terminator'}
};

function V(o) {
	o.width = o.v * 4 + 17;
	o.dm = o.width * o.width - o.fm - o.fvm;
	o.dc = Math.floor(o.dm / 8);
	o.dem = o.dm % 8;
	
	for(var i = 0; i < 4; i++) {
		ECL(o.ecl[i], o);
	}
	
	return o;
}

function ECL(o, v) {
	o.numberOfDataCodewords = v.dc - o.numberOfErrorCorrectionCodewords;
	o.numberOfDataBits = o.numberOfDataCodewords * 8;
	o.p = calcP(v.v, o.level); 
	
	o.modes = {};
	o.modes['Bytes'] = Math.floor((o.numberOfDataBits - 4 - caclCharacterCountBits(v.v, 'Bytes')) / 8);
	
	return o;
}

function caclCharacterCountBits(version, mode) {
  for(var i in NBCCI) {
	  if(i.indexOf('M') != -1 && i == version) {
		  return NBCCI[i][mode];
	  } else if (i.indexOf('-') != -1 && version >= i.split('-')[0] && version <= i.split('-')[1]) {
		  return NBCCI[i][mode];
	  }
  }
}

function calcP(v, level) {
	if(v == 1) { 
		if(level == 'L')
			return 3;
		else if(level == 'M')
			return 2;
		else 
			return 1;
	} else if(v == 2 && level == 'L') {
		return 2;
	} else if(v == 3 && level == 'L') {
		return 1;
	} else {
		return 0;
	}
}

// 纠错码生成公式
var GeneratorPolynomials = {
	 '2': 'x2+3x+2'		
	, '5': 'x5+31x4+198x3+63x2+147x+116'		
	, '6': 'x6+248x5+x4+218x3+32x2+227x+38'		
	, '7': 'x7+127x6+122x5+154x4+164x3+11x2+68x+117'		
	, '8': 'x8+255x7+11x6+81x5+54x4+239x3+173x2+200x+24'		
	, '10': 'x10+216x9+194x8+159x7+111x6+199x5+94x4+95x3+113x2+ 157x+193'		
	, '13': 'x13+137x12+73x11+227x10+17x9+177x8+17x7+52x6+13x5+ 46x4+43x3+83x2+132x+120'		
	, '14': 'x14+14x13+54x12+114x11+70x10+174x9+151x8+43x7+ 158x6+195x5+127x4+166x3+210x2+234x+163'		
	, '15': 'x15+29x14+196x13+111x12+163x11+112x10+74x9+10x8+105x7+ 105x6+139x5+132x4+151x3+32x2+134x+26'		
	, '16': 'x16+59x15+13x14+104x13+189x12+68x11+209x10+30x9+ 8x8+163x7+65x6+41x5+229x498x3+50x2+36x+59'		
	, '17': 'x17+119x16+66x15+83x14+120x13+119x12+22x11+197x10+83x9+249x8+41x7+143x6+134x5+85x4+53x3+125x2+99x+79'		
	, '18': 'x18+239x17+251x16+183x15+113x14+149x13+175x12+199x11+ 215x10+240x9+220x8+73x7+82x6+173x5+75x4+32x3+ 67x2+217x+146'		
	, '20': 'x20+152x19+185x18+240x17+5x16+111x15+99x14+6x13+220x12+ 112x11+150x10+69x9+36x8+187x7+22x6+228x5+198x4+ 121x3+121x2+165x+174'		
	, '22': 'x22+89x21+179x20+131x19+176x18+182x17+244x16+19x15+ 189x14+69x13+40x12+28x11+137x10+29x9+123x8+67x7+ 253x6+86x5+218x4+230x3+26x2+145x+245'		
	, '24': 'x24+122x23+118x22+169x21+70x20+178x19+237x18+216x17+ 102x16+115x15+150x14+229x13+73x12+130x11+72x10+ 61x9+43x8+206x7+x6+237x5+247x4+127x3+217x2+144x+ 117'		
	, '26': 'x26+246x25+51x24+183x23+4x22+136x21+98x20+199x19+ 152x18+77x17+56x16+206x15+24x14+145x13+40x12+ 209x11+117x10+233x9+42x8+135x7+68x6+70x5+144x4+ 146x3+77x2+43x+94'		
	, '28': 'x28+252x27+9x26+28x25+13x24+18x23+251x22+208x21+ 150x20+103x19+174x18+100x17+41x16+167x15+12x14+ 247x13+56x12+117x11+119x10+233x9+127x8+181x7+ 100x6+121x5+147x4+176x3+74x2+58x+197'		
	, '30': 'x30+212x29+246x28+77x27+73x26+195x25+192x24+75x23+ 98x22+5x21+70x20+103x19+177x18+22x17+217x16+ 138x15+51x14+181x13+246x12+72x11+25x10+18x9+ 46x8+228x7+74x6+216x5+195x4+11x3+106x2+130x+ 150'		
	, '32': 'x32+116x31+64x30+52x29+174x28+54x27+126x26+16x25+194x24+ 162x23+33x22+33x21+157x20+176x19+197x18+225x17+ 12x16+59x15+55x14+253x13+228x12+148x11+47x10+ 179x9+185x8+24x7+138x6+253x5+20x4+142x3+55x2+ 172x+88'		
	, '34': 'x34+206x33+60x32+154x31+113x30+6x29+117x28+208x27+ 90x26+26x25+113x24+31x23+25x22+177x21+132x20+ 99x19+51x18+105x17+183x16+122x15+22x14+43x13+ 136x12+93x11+94x10+62x9+111x8+196x7+23x6+ 126x5+135x4+67x3+222x2+23x+10'		
	, '36': 'x36+28x35+196x34+67x33+76x32+123x31+192x30+207x29+ 251x28+185x27+73x26+124x25+x24+126x23+73x22+ 31x21+27x20+11x19+104x18+45x17+161x16+43x15+ 74x14+127x13+89x12+26x11+219x10+59x9+137x8+ 118x7+200x6+237x5+216x4+31x3+243x2+96x+59'		
	, '40': 'x40+210x39+248x38+240x37+209x36+173x35+67x34+133x33+ 167x32+133x31+209x30+131x29+186x28+99x27+93x26+ 235x25+52x24+40x23+6x22+220x21+241x20+72x19+ 13x18+215x17+128x16+255x15+156x14+49x13+62x12+ 254x11+212x10+35x9+99x8+51x7+218x6+101x5+180x4+ 247x3+40x2+156x+38'		
	, '42': 'x42+108x41+136x40+69x39+244x38+3x37+45x36+158x35+ 245x34+x33+8x32+105x31+176x30+69x29+65x28+103x27+ 107x26+244x25+29x24+165x23+52x22+217x21+41x20+38x19+ 92x18+66x17+78x16+34x15+9x14+53x13+34x12+242x11+ 14x10+139x9+142x8+56x7+197x6+179x5+191x4+50x3+ 237x2+5x+217'		
	, '44': 'x44+174x43+128x42+111x41+118x40+188x39+207x38+47x37+160x36+ 252x35+165x34+225x33+125x32+65x31+3x30+101x29+197x28+ 58x27+77x26+19x25+131x24+2x23+11x22+238x21+120x20+ 84x19+222x18+18x17+102x16+199x15+62x14+153x13+99x12+ 20x11+50x10+155x9+41x8+221x7+229x6+74x5+46x4+ 31x3+68x2+202x+49'		
	, '46': 'x46+129x45+113x44+254x43+129x42+71x41+18x40+112x39+124x38+ 220x37+134x36+225x35+32x34+80x33+31x32+23x31+238x30+ 105x29+76x28+169x27+195x26+229x25+178x24+37x23+2x22+ 16x21+217x20+185x19+88x18+202x17+13x16+251x15+29x14+ 54x13+233x12+147x11+241x10+20x9+3x8+213x7+18x6+ 119x5+112x4+9x3+90x2+211x+38'		
	, '48': 'x48+61x47+3x46+200x45+46x44+178x43+154x42+185x41+143x40+ 216x39+223x38+53x37+68x36+44x35+111x34+171x33+161x32+ 159x31+197x30+124x29+45x28+69x27+206x26+169x25+230x24+ 98x23+167x22+104x21+83x20+226x19+85x18+59x17+149x16+ 163x15+117x14+131x13+228x12+132x11+11x10+65x9+232x8+ 113x7+144x6+107x5+5x4+99x3+53x2+78x+208'		
	, '50': 'x50+247x49+51x48+213x47+209x46+198x45+58x44+199x43+159x42+ 162x41+134x40+224x39+25x38+156x37+8x36+162x35+206x34+ 100x33+176x32+224x31+36x30+159x29+135x28+157x27+230x26+ 102x25+162x24+46x23+230x22+176x21+239x20+176x19+15x18+ 60x17+181x16+87x15+157x14+31x13+190x12+151x11+47x10+ 61x9+62x8+235x7+255x6+151x5+215x4+239x3+247x2+ 109x+167'		
	, '52': 'x52+248x51+5x50+177x49+110x48+5x47+172x46+216x45+225x44+ 130x43+159x42+177x41+204x40+151x39+90x38+149x37+243x36+ 170x35+239x34+234x33+19x32+210x31+77x30+74x29+176x28+ 224x27+218x26+142x25+225x24+174x23+113x22+210x21+190x20+ 151x19+31x18+17x17+243x16+235x15+118x14+234x13+30x12+ 177x11+175x10+53x9+176x8+28x7+172x6+34x5+39x4+ 22x3+142x2+248x+10'		
	, '54': 'x54+196x53+6x52+56x51+127x50+89x49+69x48+31x47+117x46+ 159x45+190x44+193x43+5x42+11x41+149x40+54x39+36x38+ 68x37+105x36+162x35+43x34+189x33+145x32+6x31+226x30+ 149x29+130x28+20x27+233x26+156x25+142x24+11x23+255x22+ 123x21+240x20+197x19+3x18+236x17+119x16+59x15+208x14+ 239x13+253x12+133x11+56x10+235x9+29x8+146x7+210x6+ 34x5+192x4+7x3+30x2+192x+228'		
	, '56': 'x56+52x55+59x54+104x53+213x52+198x51+195x50+129x49+ 248x48+4x47+163x46+27x45+99x44+37x43+56x42+112x41+ 122x40+64x39+168x38+142x37+114x36+169x35+81x34+215x33+ 162x32+205x31+66x30+204x29+42x28+98x27+54x26+219x25+ 241x24+174x23+24x22+116x21+214x20+22x19+149x18+34x17+ 151x16+73x15+83x14+217x13+201x12+99x11+111x10+12x9+ 200x8+131x7+170x6+57x5+112x4+166x3+180x2+111x+116'		
	, '58': 'x58+211x57+248x56+6x55+131x54+97x53+12x52+222x51+104x50+ 173x49+98x48+28x47+55x46+235x45+160x44+216x43+176x42+ 89x41+168x40+57x39+139x38+227x37+21x36+130x35+27x34+ 73x33+54x32+83x31+214x30+71x29+42x28+190x27+145x26+ 51x25+201x24+143x23+96x22+236x21+44x20+249x19+64x18+ 23x17+43x16+48x15+77x14+204x13+218x12+83x11+233x10+ 237x9+48x8+212x7+161x6+115x5+42x4+243x3+51x2+82x+ 197'		
	, '60': 'x60+104x59+132x58+6x57+205x56+58x55+21x54+125x53+141x52+ 72x51+141x50+86x49+193x48+178x47+34x46+86x45+59x44+ 24x43+49x42+204x41+64x40+17x39+131x38+4x37+167x36+ 7x35+186x34+124x33+86x32+34x31+189x30+230x29+211x28+ 74x27+148x26+11x25+140x24+230x23+162x22+118x21+177x20+ 232x19+151x18+96x17+49x16+107x15+3x14+50x13+127x12+ 190x11+68x10+174x9+172x8+94x7+12x6+162x5+76x4+225x3+ 128x2+39x+44'		
	, '62': 'x62+190x61+112x60+31x59+67x58+188x57+9x56+27x55+199x54+ 249x53+113x52+x51+236x50+74x49+201x48+4x47+61x46+ 105x45+118x44+128x43+26x42+169x41+120x40+125x39+199x38+ 94x37+30x36+9x35+225x34+101x33+5x32+94x31+206x30+ 50x29+152x28+121x27+102x26+49x25+156x24+69x23+237x22+ 235x21+232x20+ 122x19+164x18+41x17+197x16+242x15+106x14+ 124x13+64x12+28x11+17x10+6x9+207x8+98x7+43x6+ 204x5+239x4+37x3+110x2+103x+52'		
	, '64': 'x64+193x63+10x62+255x61+58x60+128x59+183x58+115x57+140x56+ 153x55+147x54+91x53+197x52+219x51+221x50+220x49+142x48+ 28x47+120x46+21x45+164x44+147x43+6x42+204x41+40x40+ 230x39+182x38+14x37+121x36+48x35+143x34+77x33+228x32+ 81x31+85x30+43x29+162x28+16x27+195x26+163x25+35x24+ 149x23+154x22+35x21+132x20+100x19+100x18+51x17+176x16+ 11x15+161x14+134x13+208x12+132x11+244x10+176x9+192x8+ 221x7+232x6+171x5+125x4+155x3+228x2+242x+245'		
	, '66': 'x66+32x65+199x64+138x63+150x62+79x61+79x60+191x59+10x58+ 159x57+237x56+135x55+239x54+231x53+152x52+66x51+131x50+ 141x49+179x48+226x47+246x46+190x45+158x44+171x43+153x42+ 206x41+226x40+34x39+212x38+101x37+249x36+229x35+141x34+ 226x33+128x32+238x31+57x30+60x29+206x28+203x27+106x26+ 118x25+84x24+161x23+127x22+253x21+71x20+44x19+102x18+ 155x17+60x16+78x15+247x14+52x13+5x12+252x11+211x10+ 30x9+154x8+194x7+52x6+179x5+3x4+184x3+182x2+ 193x+26'		
	, '68': 'x68+131x67+115x66+9x65+39x64+18x63+182x62+60x61+94x60+ 223x59+230x58+157x57+142x56+119x55+85x54+107x53+34x52+ 174x51+167x50+109x49+20x48+185x47+112x46+145x45+172x44+ 224x43+170x42+182x41+107x40+38x39+107x38+71x37+246x36+ 230x35+225x34+144x33+20x32+14x31+175x30+226x29+245x28+ 20x27+219x26+212x25+51x24+158x23+88x22+63x21+36x20+ 199x19+4x18+80x17+157x16+211x15+239x14+255x13+7x12+ 119x11+11x10+235x9+12x8+34x7+149x6+204x5+8x4+ 32x3+29x2+99x+11'
}

var QR = {
	'data' : '2005'
	, vl : [
		{
			v:1, fm:202, fvm:31
			, coordinatesOfCenterModule:[]
			, ecl: [
				{level: 'L', numberOfErrorCorrectionCodewords: 7, blocks:[1,0]}
				, {level: 'M', numberOfErrorCorrectionCodewords: 10, blocks:[1,0]}
				, {level: 'Q', numberOfErrorCorrectionCodewords: 13,  blocks:[1,0]}
				, {level: 'H', numberOfErrorCorrectionCodewords: 17, blocks:[1,0]}
			]
		},{
			v:2, fm:235, fvm:31
			, coordinatesOfCenterModule:[6,18]
			, ecl: [
				{level: 'L', numberOfErrorCorrectionCodewords: 10, blocks:[1,0]}
				, {level: 'M', numberOfErrorCorrectionCodewords: 16, blocks:[1,0]}
				, {level: 'Q', numberOfErrorCorrectionCodewords: 22,  blocks:[1,0]}
				, {level: 'H', numberOfErrorCorrectionCodewords: 28, blocks:[1,0]}
			]
		},{
			v:3, fm:243, fvm:31
			, coordinatesOfCenterModule:[6,22]
			, ecl: [
				{level: 'L', numberOfErrorCorrectionCodewords: 15, blocks:[1,0]}
				, {level: 'M', numberOfErrorCorrectionCodewords: 26, blocks:[1,0]}
				, {level: 'Q', numberOfErrorCorrectionCodewords: 36,  blocks:[2,0]}
				, {level: 'H', numberOfErrorCorrectionCodewords: 44, blocks:[2,0]}
			]
		},{
			v:4, fm:251, fvm:31
			, coordinatesOfCenterModule:[6,26]
			, ecl: [
				{level: 'L', numberOfErrorCorrectionCodewords: 20, blocks:[1,0]}
				, {level: 'M', numberOfErrorCorrectionCodewords: 36, blocks:[2,0]}
				, {level: 'Q', numberOfErrorCorrectionCodewords: 52,  blocks:[2,0]}
				, {level: 'H', numberOfErrorCorrectionCodewords: 64, blocks:[4,0]}
			]
		},{
			v:5, fm:259, fvm:31
			, coordinatesOfCenterModule:[6,30]
			, ecl: [
				{level: 'L', numberOfErrorCorrectionCodewords: 26, blocks:[1,0]}
				, {level: 'M', numberOfErrorCorrectionCodewords: 48, blocks:[2,0]}
				, {level: 'Q', numberOfErrorCorrectionCodewords: 72,  blocks:[2,2]}
				, {level: 'H', numberOfErrorCorrectionCodewords: 88, blocks:[2,2]}
			]
		},{
			v:6, fm:267, fvm:31
			, coordinatesOfCenterModule:[6,34]
			, ecl: [
				{level: 'L', numberOfErrorCorrectionCodewords: 36, blocks:[2,0]}
				, {level: 'M', numberOfErrorCorrectionCodewords: 64, blocks:[4,0]}
				, {level: 'Q', numberOfErrorCorrectionCodewords: 96,  blocks:[4,0]}
				, {level: 'H', numberOfErrorCorrectionCodewords: 112, blocks:[4,0]}
			]
		},{
			v:7, fm:390, fvm:67
			, coordinatesOfCenterModule:[6,22,38]
			, ecl: [
				{level: 'L', numberOfErrorCorrectionCodewords: 40, blocks:[2,0]}
				, {level: 'M', numberOfErrorCorrectionCodewords: 72, blocks:[4,0]}
				, {level: 'Q', numberOfErrorCorrectionCodewords: 108,  blocks:[2,4]}
				, {level: 'H', numberOfErrorCorrectionCodewords: 130, blocks:[4,1]}
			]
		}, {
		  ecl : [ 
		  	{level : 'L', numberOfErrorCorrectionCodewords : 48, blocks : [2, 0]}
			 , {level : 'M', numberOfErrorCorrectionCodewords : 88, blocks : [2, 2]}
			 , {level : 'Q', numberOfErrorCorrectionCodewords : 132, blocks : [4, 2]}
			 , {level : 'H', numberOfErrorCorrectionCodewords : 156, blocks : [4, 2]}
		  ],
		  v : 8, fm : 398, fvm : 67
		  , coordinatesOfCenterModule:[6,24,42]
		}, {
		  ecl : [ {
			level : 'L', numberOfErrorCorrectionCodewords : 60, blocks : [ 2, 0 ]
		  }, {
			level : 'M', numberOfErrorCorrectionCodewords : 110, blocks : [ 3, 2 ]
		  }, {
			level : 'Q', numberOfErrorCorrectionCodewords : 160, blocks : [ 4, 4 ]
		  }, {
			level : 'H', numberOfErrorCorrectionCodewords : 192, blocks : [ 4, 4 ]
		  } ],
		  v : 9,
		  fm : 406,
		  fvm : 67
		  , coordinatesOfCenterModule:[6,26,46]
		}, {
		  ecl : [ {
			level : 'L',
			numberOfErrorCorrectionCodewords : 72,
			blocks : [ 2, 2 ]
		  }, {
			level : 'M',
			numberOfErrorCorrectionCodewords : 130,
			blocks : [ 4, 1 ]
		  }, {
			level : 'Q',
			numberOfErrorCorrectionCodewords : 192,
			blocks : [ 6, 2 ]
		  }, {
			level : 'H',
			numberOfErrorCorrectionCodewords : 224,
			blocks : [ 6, 2 ]
		  } ],
		  v : 10,
		  fm : 414,
		  fvm : 67
		  , coordinatesOfCenterModule:[6,28,50]
		}, {
		  ecl : [ {
			level : 'L',
			numberOfErrorCorrectionCodewords : 80,
			blocks : [ 4, 0 ]
		  }, {
			level : 'M',
			numberOfErrorCorrectionCodewords : 150,
			blocks : [ 1, 4 ]
		  }, {
			level : 'Q',
			numberOfErrorCorrectionCodewords : 224,
			blocks : [ 4, 4 ]
		  }, {
			level : 'H',
			numberOfErrorCorrectionCodewords : 264,
			blocks : [ 3, 8 ]
		  } ],
		  v : 11,
		  fm : 422,
		  fvm : 67
		  , coordinatesOfCenterModule:[6,30,54]
		}, {
		  ecl : [ {
			level : 'L',
			numberOfErrorCorrectionCodewords : 96,
			blocks : [ 2, 2 ]
		  }, {
			level : 'M',
			numberOfErrorCorrectionCodewords : 176,
			blocks : [ 6, 2 ]
		  }, {
			level : 'Q',
			numberOfErrorCorrectionCodewords : 260,
			blocks : [ 4, 6 ]
		  }, {
			level : 'H',
			numberOfErrorCorrectionCodewords : 308,
			blocks : [ 7, 4 ]
		  } ],
		  v : 12,
		  fm : 430,
		  fvm : 67
		  , coordinatesOfCenterModule:[6,32,58]
		}, {
		  ecl : [ {
			level : 'L',
			numberOfErrorCorrectionCodewords : 104,
			blocks : [ 4, 0 ]
		  }, {
			level : 'M',
			numberOfErrorCorrectionCodewords : 198,
			blocks : [ 8, 1 ]
		  }, {
			level : 'Q',
			numberOfErrorCorrectionCodewords : 288,
			blocks : [ 8, 4 ]
		  }, {
			level : 'H',
			numberOfErrorCorrectionCodewords : 352,
			blocks : [ 12, 4 ]
		  } ],
		  v : 13,
		  fm : 438,
		  fvm : 67
		  , coordinatesOfCenterModule:[6,34,62]
		}, {
		  ecl : [ {
			level : 'L',
			numberOfErrorCorrectionCodewords : 120,
			blocks : [ 3, 1 ]
		  }, {
			level : 'M',
			numberOfErrorCorrectionCodewords : 216,
			blocks : [ 4, 5 ]
		  }, {
			level : 'Q',
			numberOfErrorCorrectionCodewords : 320,
			blocks : [ 11, 5 ]
		  }, {
			level : 'H',
			numberOfErrorCorrectionCodewords : 384,
			blocks : [ 11, 5 ]
		  } ],
		  v : 14,
		  fm : 611,
		  fvm : 67
		  , coordinatesOfCenterModule:[6,26,46,66]
		}, {
		  ecl : [ {
			level : 'L',
			numberOfErrorCorrectionCodewords : 132,
			blocks : [ 5, 1 ]
		  }, {
			level : 'M',
			numberOfErrorCorrectionCodewords : 240,
			blocks : [ 5, 5 ]
		  }, {
			level : 'Q',
			numberOfErrorCorrectionCodewords : 360,
			blocks : [ 5, 7 ]
		  }, {
			level : 'H',
			numberOfErrorCorrectionCodewords : 432,
			blocks : [ 11, 7 ]
		  } ],
		  v : 15,
		  fm : 619,
		  fvm : 67
		  , coordinatesOfCenterModule:[6,26,48,70]
		}, {
		  ecl : [ {
			level : 'L',
			numberOfErrorCorrectionCodewords : 144,
			blocks : [ 5, 1 ]
		  }, {
			level : 'M',
			numberOfErrorCorrectionCodewords : 280,
			blocks : [ 7, 3 ]
		  }, {
			level : 'Q',
			numberOfErrorCorrectionCodewords : 408,
			blocks : [ 15, 2 ]
		  }, {
			level : 'H',
			numberOfErrorCorrectionCodewords : 480,
			blocks : [ 3, 13 ]
		  } ],
		  v : 16,
		  fm : 627,
		  fvm : 67
		  , coordinatesOfCenterModule:[6,26,50,74]
		}, {
		  ecl : [ {
			level : 'L',
			numberOfErrorCorrectionCodewords : 168,
			blocks : [ 1, 5 ]
		  }, {
			level : 'M',
			numberOfErrorCorrectionCodewords : 308,
			blocks : [ 10, 1 ]
		  }, {
			level : 'Q',
			numberOfErrorCorrectionCodewords : 448,
			blocks : [ 1, 15 ]
		  }, {
			level : 'H',
			numberOfErrorCorrectionCodewords : 532,
			blocks : [ 2, 17 ]
		  } ],
		  v : 17,
		  fm : 635,
		  fvm : 67
		  , coordinatesOfCenterModule:[6,30,54,78]
		}, {
		  ecl : [ {
			level : 'L',
			numberOfErrorCorrectionCodewords : 180,
			blocks : [ 5, 1 ]
		  }, {
			level : 'M',
			numberOfErrorCorrectionCodewords : 338,
			blocks : [ 9, 4 ]
		  }, {
			level : 'Q',
			numberOfErrorCorrectionCodewords : 504,
			blocks : [ 17, 1 ]
		  }, {
			level : 'H',
			numberOfErrorCorrectionCodewords : 588,
			blocks : [ 2, 19 ]
		  } ],
		  v : 18,
		  fm : 643,
		  fvm : 67
		  , coordinatesOfCenterModule:[6,30,56,82]
		}, {
		  ecl : [ {
			level : 'L',
			numberOfErrorCorrectionCodewords : 196,
			blocks : [ 3, 4 ]
		  }, {
			level : 'M',
			numberOfErrorCorrectionCodewords : 364,
			blocks : [ 3, 11 ]
		  }, {
			level : 'Q',
			numberOfErrorCorrectionCodewords : 546,
			blocks : [ 17, 4 ]
		  }, {
			level : 'H',
			numberOfErrorCorrectionCodewords : 650,
			blocks : [ 9, 16 ]
		  } ],
		  v : 19,
		  fm : 651,
		  fvm : 67
		  , coordinatesOfCenterModule:[6,30,58,86]
		}, {
		  ecl : [ {
			level : 'L',
			numberOfErrorCorrectionCodewords : 224,
			blocks : [ 3, 5 ]
		  }, {
			level : 'M',
			numberOfErrorCorrectionCodewords : 416,
			blocks : [ 3, 13 ]
		  }, {
			level : 'Q',
			numberOfErrorCorrectionCodewords : 600,
			blocks : [ 15, 5 ]
		  }, {
			level : 'H',
			numberOfErrorCorrectionCodewords : 700,
			blocks : [ 15, 10 ]
		  } ],
		  v : 20,
		  fm : 659,
		  fvm : 67
		  , coordinatesOfCenterModule:[6,34,62,90]
		}, {
		  ecl : [ {
			level : 'L',
			numberOfErrorCorrectionCodewords : 224,
			blocks : [ 4, 4 ]
		  }, {
			level : 'M',
			numberOfErrorCorrectionCodewords : 442,
			blocks : [ 17, 0 ]
		  }, {
			level : 'Q',
			numberOfErrorCorrectionCodewords : 644,
			blocks : [ 17, 6 ]
		  }, {
			level : 'H',
			numberOfErrorCorrectionCodewords : 750,
			blocks : [ 19, 6 ]
		  } ],
		  v : 21,
		  fm : 882,
		  fvm : 67
		  , coordinatesOfCenterModule:[6,28,50,72,94]
		}, {
		  ecl : [ {
			level : 'L',
			numberOfErrorCorrectionCodewords : 252,
			blocks : [ 2, 7 ]
		  }, {
			level : 'M',
			numberOfErrorCorrectionCodewords : 476,
			blocks : [ 17, 0 ]
		  }, {
			level : 'Q',
			numberOfErrorCorrectionCodewords : 690,
			blocks : [ 7, 16 ]
		  }, {
			level : 'H',
			numberOfErrorCorrectionCodewords : 816,
			blocks : [ 34, 0 ]
		  } ],
		  v : 22,
		  fm : 890,
		  fvm : 67
		  , coordinatesOfCenterModule:[6,26,50,74,98]
		}, {
		  ecl : [ {
			level : 'L',
			numberOfErrorCorrectionCodewords : 270,
			blocks : [ 4, 5 ]
		  }, {
			level : 'M',
			numberOfErrorCorrectionCodewords : 504,
			blocks : [ 4, 14 ]
		  }, {
			level : 'Q',
			numberOfErrorCorrectionCodewords : 750,
			blocks : [ 11, 14 ]
		  }, {
			level : 'H',
			numberOfErrorCorrectionCodewords : 900,
			blocks : [ 16, 14 ]
		  } ],
		  v : 23,
		  fm : 898,
		  fvm : 67
		  , coordinatesOfCenterModule:[6,30,54,78,102]
		}, {
		  ecl : [ {
			level : 'L',
			numberOfErrorCorrectionCodewords : 300,
			blocks : [ 6, 4 ]
		  }, {
			level : 'M',
			numberOfErrorCorrectionCodewords : 560,
			blocks : [ 6, 14 ]
		  }, {
			level : 'Q',
			numberOfErrorCorrectionCodewords : 810,
			blocks : [ 11, 16 ]
		  }, {
			level : 'H',
			numberOfErrorCorrectionCodewords : 960,
			blocks : [ 30, 2 ]
		  } ],
		  v : 24,
		  fm : 906,
		  fvm : 67
		  , coordinatesOfCenterModule:[6,28,54,80,106]
		}, {
		  ecl : [ {
			level : 'L',
			numberOfErrorCorrectionCodewords : 312,
			blocks : [ 8, 4 ]
		  }, {
			level : 'M',
			numberOfErrorCorrectionCodewords : 588,
			blocks : [ 8, 13 ]
		  }, {
			level : 'Q',
			numberOfErrorCorrectionCodewords : 870,
			blocks : [ 7, 22 ]
		  }, {
			level : 'H',
			numberOfErrorCorrectionCodewords : 1050,
			blocks : [ 22, 13 ]
		  } ],
		  v : 25,
		  fm : 914,
		  fvm : 67
		  , coordinatesOfCenterModule:[6,32,58,84,110]
		}, {
		  ecl : [ {
			level : 'L',
			numberOfErrorCorrectionCodewords : 336,
			blocks : [ 10, 2 ]
		  }, {
			level : 'M',
			numberOfErrorCorrectionCodewords : 644,
			blocks : [ 19, 4 ]
		  }, {
			level : 'Q',
			numberOfErrorCorrectionCodewords : 952,
			blocks : [ 28, 6 ]
		  }, {
			level : 'H',
			numberOfErrorCorrectionCodewords : 1110,
			blocks : [ 33, 4 ]
		  } ],
		  v : 26,
		  fm : 922,
		  fvm : 67
		  , coordinatesOfCenterModule:[6,30,58,86,114]
		}, {
		  ecl : [ {
			level : 'L',
			numberOfErrorCorrectionCodewords : 360,
			blocks : [ 8, 4 ]
		  }, {
			level : 'M',
			numberOfErrorCorrectionCodewords : 700,
			blocks : [ 22, 3 ]
		  }, {
			level : 'Q',
			numberOfErrorCorrectionCodewords : 1020,
			blocks : [ 8, 26 ]
		  }, {
			level : 'H',
			numberOfErrorCorrectionCodewords : 1200,
			blocks : [ 12, 28 ]
		  } ],
		  v : 27,
		  fm : 930,
		  fvm : 67
		  , coordinatesOfCenterModule:[6,34,62,90,118]
		}, {
		  ecl : [ {
			level : 'L',
			numberOfErrorCorrectionCodewords : 390,
			blocks : [ 3, 10 ]
		  }, {
			level : 'M',
			numberOfErrorCorrectionCodewords : 728,
			blocks : [ 3, 23 ]
		  }, {
			level : 'Q',
			numberOfErrorCorrectionCodewords : 1050,
			blocks : [ 4, 31 ]
		  }, {
			level : 'H',
			numberOfErrorCorrectionCodewords : 1260,
			blocks : [ 11, 31 ]
		  } ],
		  v : 28,
		  fm : 1203,
		  fvm : 67
		  , coordinatesOfCenterModule:[6,26,50,74,98,122]
		}, {
		  ecl : [ {
			level : 'L',
			numberOfErrorCorrectionCodewords : 420,
			blocks : [ 7, 7 ]
		  }, {
			level : 'M',
			numberOfErrorCorrectionCodewords : 784,
			blocks : [ 21, 7 ]
		  }, {
			level : 'Q',
			numberOfErrorCorrectionCodewords : 1140,
			blocks : [ 1, 37 ]
		  }, {
			level : 'H',
			numberOfErrorCorrectionCodewords : 1350,
			blocks : [ 19, 26 ]
		  } ],
		  v : 29,
		  fm : 1211,
		  fvm : 67
		  , coordinatesOfCenterModule:[6,30,54,78,102,126]
		}, {
		  ecl : [ {
			level : 'L',
			numberOfErrorCorrectionCodewords : 450,
			blocks : [ 5, 10 ]
		  }, {
			level : 'M',
			numberOfErrorCorrectionCodewords : 812,
			blocks : [ 19, 10 ]
		  }, {
			level : 'Q',
			numberOfErrorCorrectionCodewords : 1200,
			blocks : [ 15, 25 ]
		  }, {
			level : 'H',
			numberOfErrorCorrectionCodewords : 1440,
			blocks : [ 23, 25 ]
		  } ],
		  v : 30,
		  fm : 1219,
		  fvm : 67
		  , coordinatesOfCenterModule:[6,26,52,78,104,130]
		}, {
		  ecl : [ {
			level : 'L',
			numberOfErrorCorrectionCodewords : 480,
			blocks : [ 13, 3 ]
		  }, {
			level : 'M',
			numberOfErrorCorrectionCodewords : 868,
			blocks : [ 2, 29 ]
		  }, {
			level : 'Q',
			numberOfErrorCorrectionCodewords : 1290,
			blocks : [ 42, 1 ]
		  }, {
			level : 'H',
			numberOfErrorCorrectionCodewords : 1530,
			blocks : [ 23, 28 ]
		  } ],
		  v : 31,
		  fm : 1227,
		  fvm : 67
		  , coordinatesOfCenterModule:[6,30,56,82,108,134]
		}, {
		  ecl : [ {
			level : 'L',
			numberOfErrorCorrectionCodewords : 510,
			blocks : [ 17, 0 ]
		  }, {
			level : 'M',
			numberOfErrorCorrectionCodewords : 924,
			blocks : [ 10, 23 ]
		  }, {
			level : 'Q',
			numberOfErrorCorrectionCodewords : 1350,
			blocks : [ 10, 35 ]
		  }, {
			level : 'H',
			numberOfErrorCorrectionCodewords : 1620,
			blocks : [ 19, 35 ]
		  } ],
		  v : 32,
		  fm : 1235,
		  fvm : 67
		  , coordinatesOfCenterModule:[6,34,60,86,112,138]
		}, {
		  ecl : [ {
			level : 'L',
			numberOfErrorCorrectionCodewords : 540,
			blocks : [ 17, 1 ]
		  }, {
			level : 'M',
			numberOfErrorCorrectionCodewords : 980,
			blocks : [ 14, 21 ]
		  }, {
			level : 'Q',
			numberOfErrorCorrectionCodewords : 1440,
			blocks : [ 29, 19 ]
		  }, {
			level : 'H',
			numberOfErrorCorrectionCodewords : 1710,
			blocks : [ 11, 46 ]
		  } ],
		  v : 33,
		  fm : 1243,
		  fvm : 67
		  , coordinatesOfCenterModule:[6,30,58,86,114,142]
		}, {
		  ecl : [ {
			level : 'L',
			numberOfErrorCorrectionCodewords : 570,
			blocks : [ 13, 6 ]
		  }, {
			level : 'M',
			numberOfErrorCorrectionCodewords : 1036,
			blocks : [ 14, 23 ]
		  }, {
			level : 'Q',
			numberOfErrorCorrectionCodewords : 1530,
			blocks : [ 44, 7 ]
		  }, {
			level : 'H',
			numberOfErrorCorrectionCodewords : 1800,
			blocks : [ 59, 1 ]
		  } ],
		  v : 34,
		  fm : 1251,
		  fvm : 67
		  , coordinatesOfCenterModule:[6,34,62,90,118,146]
		}, {
		  ecl : [ {
			level : 'L',
			numberOfErrorCorrectionCodewords : 570,
			blocks : [ 12, 7 ]
		  }, {
			level : 'M',
			numberOfErrorCorrectionCodewords : 1064,
			blocks : [ 12, 26 ]
		  }, {
			level : 'Q',
			numberOfErrorCorrectionCodewords : 1590,
			blocks : [ 39, 14 ]
		  }, {
			level : 'H',
			numberOfErrorCorrectionCodewords : 1890,
			blocks : [ 22, 41 ]
		  } ],
		  v : 35,
		  fm : 1574,
		  fvm : 67
		  , coordinatesOfCenterModule:[6,30,54,78,102,126,150]
		}, {
		  ecl : [ {
			level : 'L',
			numberOfErrorCorrectionCodewords : 600,
			blocks : [ 6, 14 ]
		  }, {
			level : 'M',
			numberOfErrorCorrectionCodewords : 1120,
			blocks : [ 6, 34 ]
		  }, {
			level : 'Q',
			numberOfErrorCorrectionCodewords : 1680,
			blocks : [ 46, 10 ]
		  }, {
			level : 'H',
			numberOfErrorCorrectionCodewords : 1980,
			blocks : [ 2, 64 ]
		  } ],
		  v : 36,
		  fm : 1582,
		  fvm : 67
		  , coordinatesOfCenterModule:[6,24,50,76,102,128,154]
		}, {
		  ecl : [ {
			level : 'L',
			numberOfErrorCorrectionCodewords : 630,
			blocks : [ 17, 4 ]
		  }, {
			level : 'M',
			numberOfErrorCorrectionCodewords : 1204,
			blocks : [ 29, 14 ]
		  }, {
			level : 'Q',
			numberOfErrorCorrectionCodewords : 1770,
			blocks : [ 49, 10 ]
		  }, {
			level : 'H',
			numberOfErrorCorrectionCodewords : 2100,
			blocks : [ 24, 46 ]
		  } ],
		  v : 37,
		  fm : 1590,
		  fvm : 67
		  , coordinatesOfCenterModule:[6,28,54,80,106,132,158]
		}, {
		  ecl : [ {
			level : 'L',
			numberOfErrorCorrectionCodewords : 660,
			blocks : [ 4, 18 ]
		  }, {
			level : 'M',
			numberOfErrorCorrectionCodewords : 1260,
			blocks : [ 13, 32 ]
		  }, {
			level : 'Q',
			numberOfErrorCorrectionCodewords : 1860,
			blocks : [ 48, 14 ]
		  }, {
			level : 'H',
			numberOfErrorCorrectionCodewords : 2220,
			blocks : [ 42, 32 ]
		  } ],
		  v : 38, fm : 1598, fvm : 67
		  , coordinatesOfCenterModule:[6,32,58,84,110,136,162]
		}, {
		  ecl : [ {
			level : 'L',
			numberOfErrorCorrectionCodewords : 720,
			blocks : [ 20, 4 ]
		  }, {
			level : 'M',
			numberOfErrorCorrectionCodewords : 1316,
			blocks : [ 40, 7 ]
		  }, {
			level : 'Q',
			numberOfErrorCorrectionCodewords : 1950,
			blocks : [ 43, 22 ]
		  }, {
			level : 'H',
			numberOfErrorCorrectionCodewords : 2310,
			blocks : [ 10, 67 ]
		  } ],
		  v : 39, fm : 1606, fvm : 67
		  , coordinatesOfCenterModule:[6,26,54,82,110,138,166]
		}, {
		  ecl : [ {
			level : 'L',
			numberOfErrorCorrectionCodewords : 750,
			blocks : [ 19, 6 ]
		  }, {
			level : 'M',
			numberOfErrorCorrectionCodewords : 1372,
			blocks : [ 18, 31 ]
		  }, {
			level : 'Q',
			numberOfErrorCorrectionCodewords : 2040,
			blocks : [ 34, 34 ]
		  }, {
			level : 'H',
			numberOfErrorCorrectionCodewords : 2430,
			blocks : [ 20, 61 ]
		  } ],
		  v : 40, fm : 1614, fvm : 67
		  , coordinatesOfCenterModule:[6,30,58,86,114,142,170]
		} 
	]
}

function init() {
	for(var i = 0; i < QR.vl.length; i++) {
		QR.vl[i] = V(QR.vl[i]);
	}
}

init();