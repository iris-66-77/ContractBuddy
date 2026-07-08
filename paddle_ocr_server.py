
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
本地 PaddleOCR 服务 - 100% 本地运行
支持中英文识别，自动忽略手写字体
"""

import base64
import io
import re
from PIL import Image
from flask import Flask, request, jsonify
from flask_cors import CORS
import paddleocr

app = Flask(__name__)
CORS(app)

# 初始化 PaddleOCR (第一次会自动下载模型，约 200MB)
ocr = paddleocr.PaddleOCR(use_angle_cls=True, lang="ch")  # lang='ch' 支持中英文


def is_handwriting(text, confidence):
    """
    检测文本是否为手写字体
    基于以下特征判断：
    1. 识别置信度较低
    2. 包含大量非标准字符
    3. 文本不连贯，有很多乱码
    """
    if confidence < 0.7:
        return True
    
    # 检测乱码字符
    messy_chars = len(re.findall(r'[^\u4e00-\u9fff\u0020-\u007e\u0020-\u007e\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff65-\uff9f]', text))
    if messy_chars > len(text) * 0.3:
        return True
    
    # 检测重复或不连贯模式
    repeat_pattern = re.search(r'(.)\1{3,}', text)
    if repeat_pattern:
        return True
    
    return False


@app.route('/api/ocr', methods=['POST'])
def ocr_endpoint():
    try:
        data = request.json
        if 'image' not in data:
            return jsonify({'error': 'Missing image field'}), 400
        
        # 解析 base64 图片
        img_data = data['image']
        if ',' in img_data:
            img_data = img_data.split(',')[1]
        
        img_bytes = base64.b64decode(img_data)
        img = Image.open(io.BytesIO(img_bytes)).convert('RGB')
        
        # OCR 识别
        result = ocr.ocr(img, cls=True)
        
        # 提取纯文本，过滤手写字体
        full_text = ""
        filtered_lines = 0
        if result and result[0]:
            for line in result[0]:
                text = line[1][0]
                confidence = line[1][1] if len(line[1]) > 1 else 1.0
                
                # 检查是否为手写字体
                if not is_handwriting(text, confidence) and text:
                    full_text += text + "\n"
                else:
                    filtered_lines += 1
        
        full_text = full_text.strip()
        
        return jsonify({
            'text': full_text,
            'success': True,
            'filtered_handwriting': filtered_lines > 0,
            'filtered_count': filtered_lines
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})


if __name__ == '__main__':
    print("🚀 正在启动本地 PaddleOCR 服务...")
    print("✨ 已启用手写字体自动过滤功能")
    print("⚠️  第一次运行会自动下载识别模型（约 200MB），请耐心等待！")
    print("📡 服务地址: http://localhost:8866")
    app.run(host='0.0.0.0', port=8866, debug=False)
