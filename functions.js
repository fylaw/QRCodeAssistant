String.prototype.replaceAll = function(reallyDo, replaceWith, ignoreCase) {
	if (!RegExp.prototype.isPrototypeOf(reallyDo))
		reallyDo = new RegExp(reallyDo, (ignoreCase ? "gi": "g"));

		return this.replace(reallyDo, replaceWith); 
};

Date.prototype.format = function(fmt) {
    var o = {
        "M+": this.getMonth() + 1,
        //月份
        "d+": this.getDate(),
        //日
        "h+": this.getHours() % 12 == 0 ? 12 : this.getHours() % 12,
        //小时
        "H+": this.getHours(),
        //小时
        "m+": this.getMinutes(),
        //分
        "s+": this.getSeconds(),
        //秒
        "q+": Math.floor((this.getMonth() + 3) / 3),
        //季度
        "S": this.getMilliseconds() //毫秒
    };
    var week = {
        "0": "\u65e5",
        "1": "\u4e00",
        "2": "\u4e8c",
        "3": "\u4e09",
        "4": "\u56db",
        "5": "\u4e94",
        "6": "\u516d"
    };
    if (/(y+)/.test(fmt)) {
        fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    }
    if (/(E+)/.test(fmt)) {
        fmt = fmt.replace(RegExp.$1, ((RegExp.$1.length > 1) ? (RegExp.$1.length > 2 ? "\u661f\u671f": "\u5468") : "") + week[this.getDay() + ""]);
    }
    for (var k in o) {
        if (new RegExp("(" + k + ")").test(fmt)) {
            fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
        }
    }
    return fmt;
}

/*
* 左补字符
*/
function paddingLeft(source, character, length) {
	while(source.length < length) {
		source = character + source;
	}
	
	return source;
}

function galois(data, gp) {
	var gpArray = polynomial2Array(gp);
	var fxArray = bits2Array(data);
	fxArray = multiply(fxArray, {coefficient: 1, power: gpArray[0].power});
	
	while(fxArray[0].power >= gpArray[0].power) {
		var t = multiply(gpArray, {coefficient: fxArray[0].coefficient, power: fxArray[0].power - gpArray[0].power});
		fxArray = add(fxArray, t);
		
		fxArray.sort(sortByPower);
	}
	
	var errorCorrectionBits = '';
	for(var i in fxArray) {
		errorCorrectionBits += paddingLeft(fxArray[i].coefficient.toString(2), '0', 8);
	}
	
	return errorCorrectionBits;
}

// 多项式转数组.例如:
// polynomial = x26 + 32x25 +70x24 +168x23 + 2
// 返回[ {coefficient:1, power:26}, {coefficient:32, power:25}, {coefficient:70, power:24}, {coefficient:168, power:23}, {coefficient:2, power:0} ]
function polynomial2Array(polynomial) {
	polynomial = polynomial.replaceAll(' ', '');
	var arr = polynomial.split('+');
	var len = arr.length;
	
	var result = [];
	
	for(var i = 0; i < len; i++) {
		var t = arr[i];
		
		var element = {};
		var index = t.indexOf('x');
		if(index == -1) {
			element.coefficient = t * 1;
			element.power = 0;
		} else {
			element.coefficient = t.substr(0, index);
			element.coefficient = element.coefficient == '' ? 1 : element.coefficient * 1;
			element.power = t.substr(index+1);
			element.power = element.power == '' ? 1 : element.power * 1;
		}
		
		result.push(element);
	}
	
	return result;
}	

// 以8位二进制为元素的字符串数组,转成特定格式的数组
// coefficient 系数
// power 次幂
function bits2Array(arr) {
	var len = arr.length;
	
	var fx = new Array();
	for(var i = 0; i < len; i++) {
		var v = parseInt(arr[i],2);
		if (v !=0) {
			fx.push({coefficient:v, power:len - 1 - i}); // 
		}
	}
	
	return fx;
}

// 多项式乘以单项式. 例如:
// f(x)=x17 +α43x16 +α139x15 +α206x14 +α78x13 +α43x12 +α239x11 +α123x10 +α206x9 +α214x8 +α147x7 +α24x6 +α99x5 +α150x4 +α39x3 +α243x2 +α163x +α136
// o = α5x8
function multiply(fx, o) {
	var result = new Array();
	
	for(var i in fx) {
		result.push({coefficient:fm(fx[i].coefficient, o.coefficient), power:fx[i].power + o.power});
	}
	
	return result;
}

// 多项式相加
// calculate exclusive logical sum fx and gx
function add(fx, gx) {
	var result = new Array();
	
	for(var i in fx) {
		var contains = false;
		
		for(var j = gx.length - 1; j >= 0; j--) {
			if(fx[i].power == gx[j].power) {
				var t = fx[i].coefficient ^ gx[j].coefficient; // 系数异或结果
				if(t) result.push({coefficient:t, power:fx[i].power}); // 如果结果不为0
				
				contains = true;
				gx.splice(j, 1);
				break;
			}
		}
		
		if(!contains) result.push(fx[i]);
	}
	
	for(var i in gx) result.push(gx[i]);
	
	return result;
}

// 费什么什么乘法
function fm(a, b) {
	var ta = GFTables_int2a[a];
	var tb = GFTables_int2a[b];
	var t = (ta + tb) % 255; // 指数
	
	return GFTables_a2int[t + ''];
}

// 按次方排序
function sortByPower(a, b) {
	return b.power - a.power;
}

// 整数对应的指数
var GFTables_int2a = [NaN, 0, 1, 25, 2, 50, 26, 198, 3, 223, 51, 238, 27, 104, 199, 75, 4, 100, 224, 14, 52, 141, 239, 129, 28, 193, 105, 248, 200, 8, 76, 113, 5, 138, 101, 47, 225, 36, 15, 33, 53, 147, 142, 218, 240, 18, 130, 69, 29, 181, 194, 125, 106, 39, 249, 185, 201, 154, 9, 120, 77, 228, 114, 166, 6, 191, 139, 98, 102, 221, 48, 253, 226, 152, 37, 179, 16, 145, 34, 136, 54, 208, 148, 206, 143, 150, 219, 189, 241, 210, 19, 92, 131, 56, 70, 64, 30, 66, 182, 163, 195, 72, 126, 110, 107, 58, 40, 84, 250, 133, 186, 61, 202, 94, 155, 159, 10, 21, 121, 43, 78, 212, 229, 172, 115, 243, 167, 87, 7, 112, 192, 247, 140, 128, 99, 13, 103, 74, 222, 237, 49, 197, 254, 24, 227, 165, 153, 119, 38, 184, 180, 124, 17, 68, 146, 217, 35, 32, 137, 46, 55, 63, 209, 91, 149, 188, 207, 205, 144, 135, 151, 178, 220, 252, 190, 97, 242, 86, 211, 171, 20, 42, 93, 158, 132, 60, 57, 83, 71, 109, 65, 162, 31, 45, 67, 216, 183, 123, 164, 118, 196, 23, 73, 236, 127, 12, 111, 246, 108, 161, 59, 82, 41, 157, 85, 170, 251, 96, 134, 177, 187, 204, 62, 90, 203, 89, 95, 176, 156, 169, 160, 81, 11, 245, 22, 235, 122, 117, 44, 215, 79, 174, 213, 233, 230, 231, 173, 232, 116, 214, 244, 234, 168, 80, 88, 175];

// 指数对应的整数
var GFTables_a2int = [1,2,4,8,16,32,64,128,29,58,116,232,205,135,19,38,76,152,45,90,180,117,234,201,143,3,6,12,24,48,96,192,157,39,78,156,37,74,148,53,106,212,181,119,238,193,159,35,70,140,5,10,20,40,80,160,93,186,105,210,185,111,222,161,95,190,97,194,153,47,94,188,101,202,137,15,30,60,120,240,253,231,211,187,107,214,177,127,254,225,223,163,91,182,113,226,217,175,67,134,17,34,68,136,13,26,52,104,208,189,103,206,129,31,62,124,248,237,199,147,59,118,236,197,151,51,102,204,133,23,46,92,184,109,218,169,79,158,33,66,132,21,42,84,168,77,154,41,82,164,85,170,73,146,57,114,228,213,183,115,230,209,191,99,198,145,63,126,252,229,215,179,123,246,241,255,227,219,171,75,150,49,98,196,149,55,110,220,165,87,174,65,130,25,50,100,200,141,7,14,28,56,112,224,221,167,83,166,81,162,89,178,121,242,249,239,195,155,43,86,172,69,138,9,18,36,72,144,61,122,244,245,247,243,251,235,203,139,11,22,44,88,176,125,250,233,207,131,27,54,108,216,173,71,142,1];