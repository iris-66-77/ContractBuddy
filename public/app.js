document.addEventListener("DOMContentLoaded", function() {
  var Toast = {
    container: null,
    init: function() {
      this.container = document.getElementById('toastContainer');
    },
    show: function(message, type) {
      type = type || 'info';
      if (!this.container) return;
      var toast = document.createElement('div');
      toast.className = 'toast toast-' + type;
      toast.textContent = message;
      this.container.appendChild(toast);
      setTimeout(function() { toast.classList.add('toast-show'); }, 10);
      setTimeout(function() {
        toast.classList.remove('toast-show');
        toast.classList.add('toast-hide');
        setTimeout(function() { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
      }, 3000);
    },
    success: function(msg) { this.show(msg, 'success'); },
    error: function(msg) { this.show(msg, 'error'); },
    info: function(msg) { this.show(msg, 'info'); },
    warning: function(msg) { this.show(msg, 'warning'); }
  };

  var DOM = {};
  DOM.navBtns = document.querySelectorAll(".nav-btn");
  DOM.textTab = document.querySelector('[data-tab="text"]');
  DOM.imageTab = document.querySelector('[data-tab="image"]');
  DOM.fileTab = document.querySelector('[data-tab="file"]');

  var els = ["imageCount","viewAnalyze","viewMemory","viewDraft","memoryBadge","tabText","tabImage","tabFile",
    "contractText","analyzeBtn","fileInput","uploadZone","previewArea","previewImg","reuploadBtn","ocrAnalyzeBtn","ocrStatus",
    "loadingSection","resultSection","errorSection","errorText","retryBtn",
    "riskBanner","riskScore","riskLabel","riskSummary","clausesList","clauseCount","battlePlan","takeaway",
    "saveToMemoryBtn","newAnalysisBtn","step1","step2","step3","step4",
    "memorySearch","categoryList","memoryList","loadMoreBtn","memoryLoadMore",
    "detailModal","detailTitle","detailBody","detailClose","detailDeleteBtn",
    "confirmModal","confirmTitle","confirmText","confirmClose","confirmCancel","confirmOk",
    "draftType","draftPartyA","draftPartyB","draftIntent","draftDetails",
    "generateDraftBtn","draftResultSection","draftResult","copyDraftBtn","newDraftBtn",
    "analyzeGeneratedBtn","draftErrorSection","draftErrorText",
    "fileUploadZone","documentInput","filePreviewArea","fileInfo","fileIcon","fileName","fileMeta","reuploadFileBtn","analyzeFileBtn",
    "validationInfo","validationIcon","needsReviewBadge","validationDetails"];

  els.forEach(function(id){ DOM[id] = document.getElementById(id); });

  DOM.tabText = document.getElementById("tab-text");
  DOM.tabImage = document.getElementById("tab-image");
  DOM.tabFile = document.getElementById("tab-file");

  var currentImages = [];
  var lastText = "";
  var currentText = "";
  var lastAnalysisResult = null;
  var lastGeneratedContract = "";

  var MEMORY = { contracts: [], visibleCount: 0, pageSize: 20, currentSearch: "", currentCategory: "", editingId: null, viewingId: null, confirmCallback: null };

  DOM.navBtns.forEach(function(btn) {
    btn.addEventListener("click", function() {
      var view = btn.dataset.view;
      DOM.navBtns.forEach(function(b) { b.classList.remove("active"); });
      btn.classList.add("active");
      document.querySelectorAll(".view").forEach(function(v) { v.classList.remove("active"); });
      if (view === "analyze") { DOM.viewAnalyze.classList.add("active"); }
      else if (view === "draft") { DOM.viewDraft.classList.add("active"); }
      else { DOM.viewMemory.classList.add("active"); loadMemoryList(); }
    });
  });

  DOM.textTab.addEventListener("click", function() {
    document.querySelectorAll(".tab-btn").forEach(function(b) { b.classList.remove("active"); });
    document.querySelectorAll(".tab-content").forEach(function(c) { c.classList.remove("active"); });
    DOM.textTab.classList.add("active"); DOM.tabText.classList.add("active");
  });

  DOM.imageTab.addEventListener("click", function() {
    document.querySelectorAll(".tab-btn").forEach(function(b) { b.classList.remove("active"); });
    document.querySelectorAll(".tab-content").forEach(function(c) { c.classList.remove("active"); });
    DOM.imageTab.classList.add("active"); DOM.tabImage.classList.add("active");
  });

  DOM.fileTab.addEventListener("click", function() {
    document.querySelectorAll(".tab-btn").forEach(function(b) { b.classList.remove("active"); });
    document.querySelectorAll(".tab-content").forEach(function(c) { c.classList.remove("active"); });
    DOM.fileTab.classList.add("active"); DOM.tabFile.classList.add("active");
  });

  var currentFile = null;

  DOM.fileUploadZone.addEventListener("click", function() { DOM.documentInput.click(); });
  DOM.documentInput.addEventListener("change", function() { if (DOM.documentInput.files.length > 0) handleDocument(DOM.documentInput.files[0]); });
  DOM.reuploadFileBtn.addEventListener("click", function() { 
    // 清空之前的文件数据
    currentFile = null;
    DOM.filePreviewArea.style.display = "none";
    DOM.fileUploadZone.style.display = "block";
    DOM.analyzeFileBtn.style.display = "none";
    DOM.documentInput.click(); 
  });

  function handleDocument(file) {
    var validTypes = ["application/pdf","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document","text/plain"];
    if (!validTypes.includes(file.type)) {
      showError("不支持的文件格式，请上传PDF、Word或TXT文件");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      showError("文件大小超过20MB限制");
      return;
    }
    currentFile = file;
    var ext = file.name.split('.').pop().toLowerCase();
    var icons = {pdf:"📄",doc:"📘",docx:"📘",txt:"📝"};
    DOM.fileIcon.textContent = icons[ext] || "📄";
    DOM.fileName.textContent = file.name;
    DOM.fileMeta.textContent = (file.size / 1024 / 1024).toFixed(2) + " MB";
    DOM.fileUploadZone.style.display = "none";
    DOM.filePreviewArea.style.display = "block";
    DOM.analyzeFileBtn.style.display = "block";
  }

  function fileToBase64(file) {
    return new Promise(function(resolve, reject) {
      var reader = new FileReader();
      reader.onload = function() { resolve(reader.result); };
      reader.onerror = function() { reject(new Error("文件读取失败")); };
      reader.readAsDataURL(file);
    });
  }

  DOM.analyzeFileBtn.addEventListener("click", async function() {
    if (!currentFile) { Toast.error("请先上传文件"); return; }
    DOM.analyzeFileBtn.disabled = true;
    DOM.analyzeFileBtn.textContent = "⏳ 提取文本中...";
    try {
      var fileData = await fileToBase64(currentFile);
      var fileInfo = { name: currentFile.name, type: currentFile.type, size: currentFile.size };
      var extractRes = await fetch("/api/files/extract-text", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ fileData: fileData, fileInfo: fileInfo })
      });
      var extractData = await extractRes.json();
      if (!extractRes.ok || extractData.error) {
        throw new Error(extractData.error || "文本提取失败");
      }
      var text = extractData.text;
      if (text.length < 10) {
        throw new Error("提取的文本内容太少");
      }
      lastText = text;
      DOM.analyzeFileBtn.textContent = "⏳ 分析中...";
      startAnalysis(text);
    } catch (err) {
      Toast.error("分析失败: " + err.message);
      DOM.analyzeFileBtn.disabled = false;
      DOM.analyzeFileBtn.textContent = "分析合同";
    }
  });

  DOM.contractText.addEventListener("input", function() {
    var val = DOM.contractText.value.trim();
    DOM.analyzeBtn.disabled = val.length < 10; lastText = val;
  });

  DOM.contractText.addEventListener("paste", function(e) {
    var items = e.clipboardData.items;
    var hasImage = false;
    for (var i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        hasImage = true;
        e.preventDefault();
        var blob = items[i].getAsFile();
        if (blob) {
          document.querySelectorAll(".tab-btn").forEach(function(b) { b.classList.remove("active"); });
          document.querySelectorAll(".tab-content").forEach(function(c) { c.classList.remove("active"); });
          DOM.imageTab.classList.add("active");
          DOM.tabImage.classList.add("active");
          handleFile(blob);
        }
        break;
      }
    }
   
  });

  DOM.analyzeBtn.addEventListener("click", function() { if (lastText && lastText.length >= 10) startAnalysis(lastText); });

  DOM.uploadZone.addEventListener("click", function() { DOM.fileInput.click(); });
  DOM.fileInput.addEventListener("change", function() { for (var i = 0; i < DOM.fileInput.files.length; i++) { handleFile(DOM.fileInput.files[i]); } });
  DOM.reuploadBtn.addEventListener("click", function() { 
    // 清空之前的照片数据
    currentImages = [];
    DOM.previewArea.style.display = "none";
    DOM.uploadZone.style.display = "block";
    DOM.ocrStatus.style.display = "none";
    
    DOM.fileInput.click(); 
  });

  function updateImageCount() {
    if (DOM.imageCount) {
      DOM.imageCount.textContent = currentImages.length > 0 ? currentImages.length + " 张已选" : "";
    }
  }

  DOM.uploadZone.addEventListener("paste", function(e) {
    e.preventDefault();
    var items = e.clipboardData.items;
    for (var i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        var blob = items[i].getAsFile();
        if (blob) { handleFile(blob); return; }
      }
    }
    showError("剪贴板中没有图片");
  });

  function handleFile(file) {
    if (!file.type.startsWith("image/")) { showError("请上传图片文件"); return; }
    var reader = new FileReader();
    reader.onload = function(e) {
      currentImages.push(e.target.result);
      DOM.previewImg.src = currentImages[currentImages.length - 1];
      DOM.uploadZone.style.display = "none";
      DOM.previewArea.style.display = "block";
      updateImageCount();
    };
    reader.readAsDataURL(file);
  }

  // 检测是否为手写字体
  function isHandwriting(text, confidence) {
    if (confidence < 0.7) return true;
    var messyChars = text.match(/[^\u4e00-\u9fff\u0020-\u007e\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff65-\uff9f]/g);
    if (messyChars && messyChars.length > text.length * 0.3) return true;
    var repeatPattern = /(.)\1{3,}/;
    if (repeatPattern.test(text)) return true;
    return false;
  }
  
  // 过滤手写字体
  function filterHandwriting(text, lines) {
    var filtered = [];
    var filteredCount = 0;
    var textLines = text.split("\n");
    for (var i = 0; i < textLines.length; i++) {
      var line = textLines[i].trim();
      var confidence = lines && lines[i] ? lines[i].confidence : 1.0;
      if (line && !isHandwriting(line, confidence)) {
        filtered.push(line);
      } else if (line) {
        filteredCount++;
      }
    }
    return {
      text: filtered.join("\n"),
      filteredHandwriting: filteredCount > 0,
      filteredCount: filteredCount
    };
  }

  DOM.ocrAnalyzeBtn.addEventListener("click", function() {
    if (currentImages.length === 0) return;
    var currentOcrIndex = 0;
    var allOcrTexts = [];
    var totalFiltered = 0;
    function ocrNextImage() {
      if (currentOcrIndex >= currentImages.length) {
        var combined = allOcrTexts.join("\n\n");
        DOM.ocrStatus.className = "ocr-status done";
        var statusText = "完成: " + currentImages.length + " 张图片,共" + combined.length + "字符";
        if (totalFiltered > 0) {
          statusText += " (已过滤" + totalFiltered + "处手写字体)";
        }
        DOM.ocrStatus.textContent = statusText;
        lastText = combined;
        startAnalysis(combined);
        return;
      }
      DOM.ocrStatus.textContent = "识别中...(" + (currentOcrIndex + 1) + "/" + currentImages.length + ") 下载语言包(15MB)...";
      DOM.ocrStatus.style.display = "block"; DOM.ocrStatus.className = "ocr-status running";
      Tesseract.recognize(currentImages[currentOcrIndex],'chi_sim+eng',{
        logger: function(m) {
          if (m.status === "recognizing text") {
            DOM.ocrStatus.textContent = "识别中...(" + (currentOcrIndex + 1) + "/" + currentImages.length + ") " + Math.round(m.progress * 100) + "%";
          }
        }
      }).then(function(result) {
        var filteredResult = filterHandwriting(result.data.text, result.data.lines);
        var t = filteredResult.text.trim();
        if (t.length >= 2) { allOcrTexts.push(t); }
        if (filteredResult.filteredCount > 0) {
          totalFiltered += filteredResult.filteredCount;
        }
        currentOcrIndex++;
        ocrNextImage();
      }).catch(function(err) {
        DOM.ocrStatus.className = "ocr-status error";
        DOM.ocrStatus.textContent = "OCR出错: " + (err.message || "");
      });
    }
    ocrNextImage();
  });

  function startAnalysis(text) {
    currentText = text; lastAnalysisResult = null; hideAllSections();
    DOM.loadingSection.style.display = "block"; animateLoading();
    var controller = new AbortController();
    var timeoutId = setTimeout(function() { controller.abort(); }, 60000);
    fetch("/api/analyze", { method:"POST", headers:{"Content-Type":"application/json; charset=utf-8"}, body:JSON.stringify({text:text}), signal: controller.signal })
      .then(function(r){ clearTimeout(timeoutId); return r.json(); })
      .then(function(data) {
        if (data.error) throw new Error(data.error);
        lastAnalysisResult = data;
        return fetch("/api/risk/validate", { method:"POST", headers:{"Content-Type":"application/json; charset=utf-8"}, body:JSON.stringify({analysisResult:data,contractText:text}) })
          .then(function(r){ if (r.ok) return r.json(); return null; })
          .then(function(validationData){ 
            renderResults(data, validationData); 
          })
          .catch(function(){ renderResults(data); });
      })
      .catch(function(err) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
          hideAllSections(); DOM.errorSection.style.display = "block";
          DOM.errorText.textContent = "分析请求超时，请稍后重试";
        } else {
          hideAllSections(); DOM.errorSection.style.display = "block"; DOM.errorText.textContent = err.message || "分析失败";
        }
      });
  }

  function renderResults(data, validationData) {
    hideAllSections(); DOM.resultSection.style.display="block";
    var risk = (data.overall_risk || "中").toLowerCase();
    var score = data.risk_score || 50;
    DOM.riskBanner.className = "risk-banner " + (risk === "high" ? "high" : risk === "low" ? "low" : "medium");
    DOM.riskScore.textContent = score;
    DOM.riskLabel.textContent = "风险等级：" + (risk === "high" ? "高危" : risk === "low" ? "低危" : "中危");
    DOM.riskSummary.textContent = data.summary || "分析完成";
    var onlineVerify = data.online_verification || [];
    var verifyMap = {};
    onlineVerify.forEach(function(v){ if(v.clause_index!==undefined) verifyMap[v.clause_index]=v; });
    if(onlineVerify.length>0){
      DOM.riskSummary.innerHTML = escapeHtml(data.summary || "分析完成") + '<span style="margin-left:12px;font-size:13px;color:var(--success-green);">🔍 已联网验证 ' + onlineVerify.length + ' 条条款</span>';
    }
    var clauses = data.clauses || [];
    DOM.clauseCount.textContent = clauses.length;
    if (clauses.length === 0) {
      DOM.clausesList.innerHTML = '<div class="no-risk-message"><div class="no-risk-icon">✅</div><div class="no-risk-text">未发现明显霸王条款</div><div class="no-risk-desc">这份合同风险较低，可以放心签署</div></div>';
    } else {
      DOM.clausesList.innerHTML = clauses.map(function(c, idx) {
        var rl = (c.risk_level || "中危").toLowerCase();
        var rc = rl.indexOf("高") >= 0 ? "high" : rl.indexOf("低") >= 0 ? "low" : "medium";
        var verifyBadge = verifyMap[idx] ? '<span style="margin-left:8px;font-size:12px;color:var(--success-green);">🔍 已联网验证</span>' : '';
        var verifyRefs = verifyMap[idx] ? '<div class="detail-section"><div class="detail-label">联网搜索参考</div>' + verifyMap[idx].results.map(function(r){return '<div style="font-size:13px;color:var(--text-secondary);margin:4px 0;">• ' + escapeHtml(r.title) + (r.snippet?'<br><span style="color:var(--text-muted);">' + escapeHtml(r.snippet) + '</span>':'') + '</div>';}).join('') + '</div>' : '';
        return '<div class="clause-card ' + rc + '"><div class="clause-header"><span class="clause-type">' + escapeHtml(c.type || "霸王条款") + '</span><span class="clause-risk-badge">' + (rl.indexOf("高") >= 0 ? "高危" : rl.indexOf("低") >= 0 ? "低危" : "中危") + '</span>' + verifyBadge + '</div><div class="clause-text">' + escapeHtml(c.clause || "") + '</div>' + (c.explanation ? '<div class="clause-explain">' + escapeHtml(c.explanation) + '</div>' : "") + (c.counter_script ? '<div class="detail-section"><div class="detail-label">对线话术</div><div class="script-box">' + escapeHtml(c.counter_script) + '</div></div>' : "") + (c.recommended_fix ? '<div class="detail-section"><div class="detail-label">建议修改</div><div class="script-box">' + escapeHtml(c.recommended_fix) + '</div></div>' : "") + verifyRefs + '</div>';
      }).join("");
    }
    var plan = data.battle_plan || [];
    if (plan.length > 0) { DOM.battlePlan.innerHTML = plan.map(function(p) { return '<div class="battle-step"><div class="battle-number">' + escapeHtml(p.step || "●") + '</div><div class="battle-body"><div class="battle-action">' + escapeHtml(p.action || "") + '</div>' + (p.detail ? '<div class="battle-detail">' + escapeHtml(p.detail) + '</div>' : "") + (p.script ? '<div class="battle-script">' + escapeHtml(p.script) + '</div>' : '') + '</div></div>'; }).join(""); }
    DOM.takeaway.innerHTML = data.key_takeaway ? '<div class="takeaway-line">' + escapeHtml(data.key_takeaway) + '</div>' : "";
    if (data.summary) { DOM.riskSummary.textContent = data.summary; }
    if (validationData) {
      renderValidationInfo(validationData);
    }
    DOM.resultSection.scrollIntoView({ behavior:"smooth", block:"start" });
  }

  function renderValidationInfo(validation) {
    DOM.validationInfo.style.display = "block";
    DOM.validationIcon.textContent = validation.validation && validation.validation.pass ? "✅" : "⚠️";
    DOM.needsReviewBadge.style.display = validation.needsReview ? "inline-block" : "none";
    var html = '';
    if (validation.standardAssessment && validation.standardAssessment.details) {
      var details = validation.standardAssessment.details;
      html += '<div style="font-size:14px;color:var(--text-secondary);margin-bottom:8px;">';
      html += '标准评分: ' + validation.standardAssessment.score + '分';
      if (details.highRiskClauses > 0) html += ' | 高危条款: ' + details.highRiskClauses + '条';
      if (details.mediumRiskClauses > 0) html += ' | 需注意条款: ' + details.mediumRiskClauses + '条';
      if (details.falsePositiveClauses > 0) html += ' | 疑似误判: ' + details.falsePositiveClauses + '条';
      html += '</div>';
    }
    if (validation.validation && validation.validation.conflicts && validation.validation.conflicts.length > 0) {
      html += '<div style="font-size:13px;color:var(--warning-text);">';
      validation.validation.conflicts.forEach(function(conflict) {
        if (conflict.type === "level_conflict") {
          html += '⚠️ AI评定与标准算法不一致，已采用标准算法结果';
        } else if (conflict.type === "score_conflict") {
          html += '⚠️ AI评分偏差较大(' + conflict.difference + '分)，已采用标准评分';
        }
      });
      html += '</div>';
    }
    DOM.validationDetails.innerHTML = html || '<div style="font-size:14px;color:var(--text-secondary);">评定验证通过</div>';
  }

  DOM.saveToMemoryBtn.addEventListener("click", function() {
    if (!currentText) return;
    var btn = DOM.saveToMemoryBtn; 
    btn.disabled = true; 
    btn.textContent = "保存中...";
    
    async function saveContractWithFiles() {
      try {
        var uploadedFileIds = [];
        
        if (currentImages.length > 0) {
          for (var i = 0; i < currentImages.length; i++) {
            var fileData = currentImages[i];
            var fileInfo = { name: "合同图片" + (i + 1) + ".png", type: "image/png", size: 0 };
            var result = await uploadSingleFile(fileData, fileInfo);
            if (result && result.id) {
              uploadedFileIds.push(result.id);
            }
          }
        }
        
        if (currentFile) {
          var fileData = await fileToBase64(currentFile);
          var fileInfo = { name: currentFile.name, type: currentFile.type, size: currentFile.size };
          var result = await uploadSingleFile(fileData, fileInfo);
          if (result && result.id) {
            uploadedFileIds.push(result.id);
          }
        }
        
        var response = await fetch("/api/memory/contracts", { 
          method: "POST", 
          headers: {"Content-Type": "application/json; charset=utf-8"}, 
          body: JSON.stringify({
            text: currentText,
            analysisResult: lastAnalysisResult,
            fileIds: uploadedFileIds
          }) 
        });
        var data = await response.json();
        btn.textContent = "已保存"; 
        updateMemoryBadge();
        Toast.success('合同已保存到记忆库');
      } catch (err) {
        btn.textContent = "保存失败"; 
        btn.disabled = false;
        Toast.error('保存失败: ' + err.message);
      }
    }
    
    async function uploadSingleFile(fileData, fileInfo) {
      try {
        var response = await fetch("/api/files/upload", {
          method: "POST",
          headers: {"Content-Type": "application/json; charset=utf-8"},
          body: JSON.stringify({
            fileData: fileData,
            fileInfo: fileInfo
          })
        });
        if (response.ok) {
          return await response.json();
        } else {
          var errData = await response.json().catch(function() { return { error: '上传请求失败' }; });
          Toast.error('文件上传失败: ' + (errData.error || '未知错误'));
          return null;
        }
      } catch (e) {
        console.log("文件上传失败:", e);
        Toast.warning('文件上传失败: ' + e.message);
      }
      return null;
    }
    
    function fileToBase64(file) {
      return new Promise(function(resolve, reject) {
        var reader = new FileReader();
        reader.onload = function() { resolve(reader.result); };
        reader.onerror = function() { reject(new Error("读取文件失败")); };
        reader.readAsDataURL(file);
      });
    }
    
    saveContractWithFiles();
  });

  function loadMemoryList() {
    var params = [];
    if (MEMORY.currentSearch) params.push("search=" + encodeURIComponent(MEMORY.currentSearch));
    if (MEMORY.currentCategory) params.push("category=" + encodeURIComponent(MEMORY.currentCategory));
    var url = "/api/memory/contracts" + (params.length ? "?" + params.join("&") : "");
    fetch(url).then(function(r) { return r.json(); }).then(function(list) {
      MEMORY.contracts = list; renderMemoryList(); renderCategories();
    }).catch(function() {});
  }

  function renderMemoryList() {
    var list = MEMORY.contracts;
    DOM.memoryList.innerHTML = "";
    if (list.length === 0) {
      DOM.memoryList.innerHTML = '<div class="memory-empty"><div class="empty-icon">📭</div><p class="empty-text">' + (MEMORY.currentSearch ? "没有找到匹配的合同" : "记忆库还是空的") + '</p></div>';
      DOM.memoryLoadMore.style.display = "none"; return;
    }
    list.forEach(function(c) {
      var rc = c.riskLevel === "高" ? "high" : c.riskLevel === "低" ? "low" : "medium";
      var card = document.createElement("div");
      card.className = "memory-card " + rc;
      var hasFiles = c.fileIds && c.fileIds.length > 0;
      var fileBadge = hasFiles ? '<span style="margin-left:8px;font-size:12px;color:var(--primary);" title="有附件可下载">📎</span>' : '';
      card.innerHTML = '<div class="memory-card-top"><span class="memory-category-badge">' + (c.categoryIcon || "📄") + " " + (c.category || "未分类") + '</span><span class="memory-risk-badge ' + rc + '">' + c.riskLevel + '</span></div><div class="memory-card-title">' + escapeHtml(c.title || "未命名") + fileBadge + '</div>' + (c.summary ? '<div class="memory-card-summary">' + escapeHtml(c.summary) + '</div>' : "") + '<div class="memory-card-meta"><span>🔪 ' + (c.clauseCount || 0) + ' 条陷阱</span>' + (hasFiles ? '<span>📎 有附件</span>' : '') + '<span>📅 ' + formatDate(c.createdAt) + '</span></div>';
      card.addEventListener("click", function() { openDetail(c.id); });
      DOM.memoryList.appendChild(card);
    });
    updateMemoryBadge();
  }

  function renderCategories() {
    fetch("/api/memory/categories").then(function(r) { return r.json(); }).then(function(data) {
      var cats = data.categories || [];
      var html = '<button class="cat-chip active" data-cat="">📚 全部 (' + (data.total || 0) + ')</button>';
      cats.forEach(function(cat) {
        html += '<button class="cat-chip" data-cat="' + escapeHtml(cat.category) + '">' + (cat.icon || "📄") + " " + cat.category + " (" + cat.count + ")</button>";
      });
      DOM.categoryList.innerHTML = html;
      DOM.categoryList.querySelectorAll(".cat-chip").forEach(function(chip) {
        chip.addEventListener("click", function() {
          DOM.categoryList.querySelectorAll(".cat-chip").forEach(function(c) { c.classList.remove("active"); });
          chip.classList.add("active");
          MEMORY.currentCategory = chip.dataset.cat || "";
          loadMemoryList();
        });
      });
    }).catch(function() {});
  }

  var searchTimer = null;
  DOM.memorySearch.addEventListener("input", function() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function() {
      MEMORY.currentSearch = DOM.memorySearch.value.trim();
      MEMORY.currentCategory = "";
      DOM.categoryList.querySelectorAll(".cat-chip").forEach(function(c) { c.classList.remove("active"); });
      var allChip = DOM.categoryList.querySelector('.cat-chip[data-cat=""]');
      if (allChip) allChip.classList.add("active");
      loadMemoryList();
    }, 300);
  });

  function openDetail(id) {
    Promise.all([
      fetch("/api/memory/contracts/" + id).then(function(r) { return r.json(); }),
      fetch("/api/files/contract/" + id).then(function(r) { return r.ok ? r.json() : []; })
    ]).then(function(results) {
      var c = results[0];
      var files = results[1];
      MEMORY.viewingId = id;
      DOM.detailTitle.textContent = c.title || "合同详情";
      var html = '<div class="detail-info-grid"><div class="detail-info-item"><span>分类</span><span>' + (c.categoryIcon || "📄") + " " + (c.category || "未分类") + '</span></div><div class="detail-info-item"><span>风险等级</span><span class="risk-tag ' + (c.riskLevel === "高" ? "high" : c.riskLevel === "低" ? "low" : "medium") + '">' + c.riskLevel + '</span></div><div class="detail-info-item"><span>风险评分</span><span>' + (c.riskScore || "-") + '</span></div><div class="detail-info-item"><span>陷阱条款</span><span>' + (c.clauseCount || 0) + ' 条</span></div></div>';
      
      var hasImages = files && files.some(function(f) { return f.category === "image"; });
      
      if (hasImages) {
        html += '<div class="detail-section"><h4>合同图片</h4><div class="images-preview">';
        files.forEach(function(file) {
          if (file.category === "image") {
            var imgUrl = file.cdnUrl || '/api/files/' + file.id;
            html += '<img src="' + imgUrl + '" alt="合同图片" class="preview-image" />';
          }
        });
        html += '</div></div>';
      }
      
      if (files && files.length > 0) {
        var nonImageFiles = files.filter(function(f) { return f.category !== "image"; });
        if (nonImageFiles.length > 0) {
          html += '<div class="detail-section"><h4>关联文档</h4><div class="files-list">';
          nonImageFiles.forEach(function(file) {
            html += '<div class="file-item"><span class="file-icon">📄</span><div class="file-info"><span class="file-name">' + escapeHtml(file.originalName) + '</span><span class="file-meta">' + (file.size ? (file.size / 1024).toFixed(1) + " KB" : "") + '</span></div><a class="btn btn-sm" style="background:var(--primary);color:#fff;white-space:nowrap;" href="/api/files/' + file.id + '" target="_blank">下载</a></div>';
          });
          html += '</div></div>';
        }
      }
      
      if (c.summary) html += '<div class="detail-section"><h4>摘要</h4><p>' + escapeHtml(c.summary) + '</p></div>';
      
      if (!hasImages && c.originalText) {
        html += '<div class="detail-section"><h4>原文</h4><pre>' + escapeHtml(c.originalText) + '</pre></div>';
      }
      
      DOM.detailBody.innerHTML = html;
      DOM.detailDeleteBtn.dataset.id = id;
      DOM.detailModal.style.display = "flex";
    }).catch(function() {});
  }

  DOM.detailClose.addEventListener("click", function() { DOM.detailModal.style.display = "none"; });
  DOM.detailModal.addEventListener("click", function(e) { if (e.target === DOM.detailModal) DOM.detailModal.style.display = "none"; });

  DOM.detailDeleteBtn.addEventListener("click", function() {
    var id = DOM.detailDeleteBtn.dataset.id; if (!id) return;
    DOM.confirmTitle.textContent = "删除合同";
    DOM.confirmText.textContent = "确定删除？此操作不可撤销。";
    DOM.confirmModal.style.display = "flex";
    MEMORY.confirmCallback = function() {
      fetch("/api/memory/contracts/" + id, { method:"DELETE" }).then(function() { DOM.detailModal.style.display = "none"; loadMemoryList(); }).catch(function() {});
    };
  });

  DOM.confirmClose.addEventListener("click", function() { DOM.confirmModal.style.display = "none"; });
  DOM.confirmCancel.addEventListener("click", function() { DOM.confirmModal.style.display = "none"; });
  DOM.confirmOk.addEventListener("click", function() { if (MEMORY.confirmCallback) { MEMORY.confirmCallback(); } DOM.confirmModal.style.display = "none"; });

  function hideAllSections() {
    DOM.loadingSection.style.display = "none";
    DOM.resultSection.style.display = "none";
    DOM.errorSection.style.display = "none";
    DOM.draftResultSection.style.display = "none";
    DOM.draftErrorSection.style.display = "none";
    [DOM.step1, DOM.step2, DOM.step3, DOM.step4].forEach(function(s) { s.className = "loading-step"; });
  }

  function animateLoading() {
    var steps = [DOM.step1, DOM.step2, DOM.step3, DOM.step4];
    var i = 0;
    steps[0].className = "loading-step active";
    var interval = setInterval(function() {
      if (i > 0) steps[Math.min(i - 1, steps.length - 1)].className = "loading-step done";
      if (i < steps.length) steps[i].className = "loading-step active"; i++;
      if (i > steps.length) clearInterval(interval);
    }, 1200);
  }

  function showError(msg) { hideAllSections(); DOM.errorSection.style.display = "block"; DOM.errorText.textContent = msg; Toast.error(msg); }

  function escapeHtml(s) { if (!s) return ""; var d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

  function formatDate(s) { if (!s) return "-"; var d = new Date(s); return String(d.getMonth() + 1).padStart(2, "0") + "/" + String(d.getDate()).padStart(2, "0") + " " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); }

  function updateMemoryBadge() { fetch("/api/memory/categories").then(function(r) { return r.json(); }).then(function(d) { if (d.total > 0) { DOM.memoryBadge.style.display = "inline"; DOM.memoryBadge.textContent = d.total > 99 ? "99+" : d.total; } else { DOM.memoryBadge.style.display = "none"; } }).catch(function() {}); }

  DOM.retryBtn.addEventListener("click", function() { if (currentText) startAnalysis(currentText); });
  DOM.newAnalysisBtn.addEventListener("click", function() { hideAllSections(); DOM.contractText.value = ""; DOM.analyzeBtn.disabled = true; DOM.analyzeBtn.innerHTML = '<span class="btn-icon">⚡</span> 穿透分析'; lastText = ""; currentText = ""; lastAnalysisResult = null; currentImages = []; DOM.uploadZone.style.display = "block"; updateImageCount(); DOM.previewArea.style.display = "none"; DOM.previewImg.src = ""; DOM.ocrStatus.style.display = "none"; DOM.fileInput.value = ""; });
  DOM.loadMoreBtn.addEventListener("click", function() { loadMemoryList(); });

  DOM.generateDraftBtn.addEventListener("click", function() {
    var type = DOM.draftType.value;
    var partyA = DOM.draftPartyA.value.trim();
    var partyB = DOM.draftPartyB.value.trim();
    var intent = DOM.draftIntent.value.trim();
    var details = DOM.draftDetails.value.trim();

    if (!type || !partyA || !partyB || !intent) {
      DOM.draftErrorSection.style.display = "block";
      DOM.draftErrorText.textContent = "请填写完整信息：合同类型、甲乙双方、合同意图";
      return;
    }

    hideAllSections();
    DOM.generateDraftBtn.disabled = true;
    DOM.generateDraftBtn.textContent = "生成中...";

    fetch("/api/contract/draft", {
      method: "POST",
      headers: {"Content-Type": "application/json; charset=utf-8"},
      body: JSON.stringify({ type: type, partyA: partyA, partyB: partyB, intent: intent, details: details })
    })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.error) throw new Error(data.error);
        lastGeneratedContract = data.contract;
        var previewText = data.contract
          .replace(/\t+/g, '          ')
          .replace(/@(?:TITLE|SUB|PREAMBLE)@/g, '');
        DOM.draftResult.value = previewText;
        DOM.draftResultSection.style.display = "block";
        DOM.generateDraftBtn.disabled = false;
        DOM.generateDraftBtn.textContent = "✨ 生成合同草案";
      })
      .catch(function(err) {
        DOM.draftErrorSection.style.display = "block";
        DOM.draftErrorText.textContent = "生成失败: " + err.message;
        DOM.generateDraftBtn.disabled = false;
        DOM.generateDraftBtn.textContent = "✨ 生成合同草案";
      });
  });

  DOM.copyDraftBtn.addEventListener("click", function() {
    var type = DOM.draftType.value, partyA = DOM.draftPartyA.value, partyB = DOM.draftPartyB.value, intent = DOM.draftIntent.value, details = DOM.draftDetails.value;
    if (!type || !partyA || !partyB || !intent) {
      Toast.error("请填写完整信息：合同类型、甲乙双方、合同意图");
      return;
    }
    DOM.copyDraftBtn.disabled = true;
    DOM.copyDraftBtn.textContent = "⏳ 生成中...";
    fetch("/api/contract/download", {
      method: "POST",
      headers: {"Content-Type": "application/json; charset=utf-8"},
      body: JSON.stringify({ type: type, partyA: partyA, partyB: partyB, intent: intent, details: details })
    })
      .then(function(r) {
        if (!r.ok) return r.json().then(function(d) { throw new Error(d.error || "下载失败"); });
        var cd = r.headers.get("Content-Disposition") || "";
        var fn = cd.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        var filename = fn ? fn[1].replace(/['"]/g, "") : "合同.docx";
        return r.blob().then(function(blob) {
          var url = URL.createObjectURL(blob);
          var a = document.createElement("a");
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        });
      })
      .then(function() {
        DOM.copyDraftBtn.textContent = "✅ 已下载";
        Toast.success("合同文档已下载");
        setTimeout(function() { DOM.copyDraftBtn.textContent = "📥 下载合同"; DOM.copyDraftBtn.disabled = false; }, 2000);
      })
      .catch(function(err) {
        DOM.copyDraftBtn.textContent = "📥 下载合同";
        DOM.copyDraftBtn.disabled = false;
        Toast.error("下载失败: " + err.message);
      });
  });

  DOM.newDraftBtn.addEventListener("click", function() {
    hideAllSections();
    DOM.draftType.value = "";
    DOM.draftPartyA.value = "";
    DOM.draftPartyB.value = "";
    DOM.draftIntent.value = "";
    DOM.draftDetails.value = "";
  });

  updateMemoryBadge();
  Toast.init();
});
