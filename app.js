const { createApp, ref, computed, onMounted, watch, nextTick } = Vue;

const DEFAULT_DB = {
    brands: ['星巴克', '瑞幸', 'Manner', 'Tims', '一点点', '喜茶', '奈雪', '霸王茶姬', '自定义'],
    drinks: [
        { id: 1, brand: '瑞幸', name: '标准美式', type: '咖啡', baseCaffeine: 150, baseKcal: 15, sugarFactor: 0 },
        { id: 2, brand: '瑞幸', name: '标准拿铁', type: '咖啡', baseCaffeine: 150, baseKcal: 180, sugarFactor: 0 },
        { id: 3, brand: '星巴克', name: '星冰乐', type: '咖啡', baseCaffeine: 100, baseKcal: 300, sugarFactor: 50 },
        { id: 4, brand: '一点点', name: '冰淇淋红茶', type: '奶茶', baseCaffeine: 50, baseKcal: 280, sugarFactor: 40 },
        { id: 5, brand: '喜茶', name: '多肉葡萄', type: '奶茶', baseCaffeine: 40, baseKcal: 200, sugarFactor: 60 },
        { id: 6, brand: '霸王茶姬', name: '伯牙绝弦', type: '奶茶', baseCaffeine: 130, baseKcal: 180, sugarFactor: 50 },
        { id: 7, brand: 'Manner', name: '澳瑞白', type: '咖啡', baseCaffeine: 160, baseKcal: 120, sugarFactor: 0 },
        { id: 8, brand: '自定义', name: '自制咖啡', type: '咖啡', baseCaffeine: 100, baseKcal: 50, sugarFactor: 0 },
        { id: 9, brand: '自定义', name: '自制奶茶', type: '奶茶', baseCaffeine: 50, baseKcal: 200, sugarFactor: 50 }
    ],
    sugarLevels: [
        { label: '无糖', value: 0 },
        { label: '三分糖', value: 0.3 },
        { label: '五分糖', value: 0.5 },
        { label: '七分糖', value: 0.7 },
        { label: '全糖', value: 1.0 }
    ],
    cupSizes: [
        { brand: '通用', label: '中杯', volume: 400, ratio: 0.8 },
        { brand: '通用', label: '大杯', volume: 500, ratio: 1.0 },
        { brand: '通用', label: '超大杯', volume: 600, ratio: 1.2 },
        { brand: '星巴克', label: '中杯(Tall)', volume: 355, ratio: 0.71 },
        { brand: '星巴克', label: '大杯(Grande)', volume: 473, ratio: 0.95 },
        { brand: '星巴克', label: '超大杯(Venti)', volume: 591, ratio: 1.18 },
        { brand: '霸王茶姬', label: '中杯', volume: 500, ratio: 1.0 },
        { brand: '霸王茶姬', label: '大杯', volume: 700, ratio: 1.4 }
    ],
    temperatures: ['冰', '热', '常温'],
    toppings: [
        { label: '珍珠', kcal: 150 },
        { label: '椰果', kcal: 80 },
        { label: '布丁', kcal: 100 },
        { label: '仙草', kcal: 50 },
        { label: '奶盖', kcal: 200 }
    ]
};

// Initialize DB from LocalStorage or Default
const getInitialDB = () => {
    const saved = localStorage.getItem('caffeLog_db_v2'); // Use a new key to force update for new structure
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch(e) {
            console.error("Failed to parse saved DB", e);
        }
    }
    return JSON.parse(JSON.stringify(DEFAULT_DB));
};

const CAFFEINE_HALF_LIFE = 5; // 5 hours
const CAFFEINE_LIMIT = 400; // mg

createApp({
    setup() {
        const db = ref(getInitialDB());
        const currentTab = ref('home');
        const currentDate = ref(new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' }));
        const records = ref(JSON.parse(localStorage.getItem('caffeLog_records') || '[]'));
        
        // AI Settings & Profile
        const userSettings = ref(JSON.parse(localStorage.getItem('caffeLog_userSettings')) || {
            aiProvider: 'openai',
            apiKey: '',
            baseUrl: 'https://api.openai.com/v1',
            goal: '减脂期',
            tastePreference: ''
        });

        watch(userSettings, (newVal) => {
            localStorage.setItem('caffeLog_userSettings', JSON.stringify(newVal));
        }, { deep: true });

        // Save to local storage on change
        watch(records, (newVal) => {
            localStorage.setItem('caffeLog_records', JSON.stringify(newVal));
            if(currentTab.value === 'home') renderChart();
        }, { deep: true });

        // Record Modal State
        const isRecordModalOpen = ref(false);
        const newRecord = ref({
            brand: '瑞幸',
            drinkId: null,
            cupSize: 1.0,
            cupSizeLabel: '大杯',
            temperature: '冰',
            sugar: 0,
            sugarLabel: '无糖',
            toppings: [],
            time: '12:00'
        });

        // Filter drinks based on brand
        const availableDrinks = computed(() => {
            return db.value.drinks.filter(d => d.brand === newRecord.value.brand);
        });

        // Filter cup sizes based on brand
        const availableCupSizes = computed(() => {
            const specific = db.value.cupSizes.filter(c => c.brand === newRecord.value.brand);
            if (specific.length > 0) return specific;
            return db.value.cupSizes.filter(c => c.brand === '通用' || !c.brand);
        });

        // Date utils
        const getTodayString = () => new Date().toISOString().split('T')[0];
        
        const todayRecords = computed(() => {
            const today = getTodayString();
            return records.value.filter(r => r.date === today).sort((a,b) => a.time.localeCompare(b.time));
        });

        const todayStats = computed(() => {
            let kcal = 0, caffeine = 0;
            todayRecords.value.forEach(r => {
                kcal += r.kcal;
                caffeine += r.caffeine;
            });
            return { kcal: Math.round(kcal), caffeine };
        });

        const warningMessage = computed(() => {
            if (todayStats.value.caffeine > CAFFEINE_LIMIT) return '⚠️ 咖啡因摄入已超标！';
            // Simple curve peak check (handled later in chart, but simple text here)
            return null;
        });

        // Calendar logic
        const calendarDays = computed(() => {
            const date = new Date();
            const year = date.getFullYear();
            const month = date.getMonth();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            
            const days = [];
            for (let i = 1; i <= daysInMonth; i++) {
                const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
                const dayRecords = records.value.filter(r => r.date === dateStr);
                days.push({
                    date: dateStr,
                    dateNum: i,
                    records: dayRecords,
                    stats: dayRecords.reduce((acc, r) => {
                        acc.caffeine += r.caffeine;
                        acc.kcal += r.kcal;
                        return acc;
                    }, { caffeine: 0, kcal: 0 })
                });
            }
            return days;
        });

        const calendarBlanks = computed(() => {
            const date = new Date();
            const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
            return Array.from({length: firstDay}, (_, i) => i);
        });

        const getDayClass = (day) => {
            if (day.records.length === 0) return 'bg-gray-50/50 text-gray-400 border-gray-200 border-dashed';
            const { caffeine, kcal } = day.stats;
            if (caffeine > 400) return 'bg-red-100 border-red-300 text-red-900';
            if (caffeine > 200 || kcal > 300) return 'bg-orange-100 border-orange-300 text-orange-900';
            return 'bg-green-100 border-green-300 text-green-900';
        };

        const selectedDayStats = ref(null);
        const showDayStats = (day) => {
            if (day.records.length > 0) {
                selectedDayStats.value = { date: day.date, ...day.stats };
            }
        };

        // Actions
        const openRecordModal = () => {
            const now = new Date();
            newRecord.value = {
                brand: '瑞幸',
                drinkId: null,
                cupSize: 1.0,
                cupSizeLabel: '大杯',
                temperature: '冰',
                sugar: 0,
                sugarLabel: '无糖',
                toppings: [],
                time: `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
            };
            selectBrand('瑞幸');
            isRecordModalOpen.value = true;
        };

        const closeRecordModal = () => {
            isRecordModalOpen.value = false;
        };

        const selectBrand = (brand) => {
            newRecord.value.brand = brand;
            newRecord.value.drinkId = null;
            nextTick(() => {
                if (availableCupSizes.value.length > 0) {
                    const defaultCup = availableCupSizes.value.find(c => (c.ratio === 1.0 || c.value === 1.0)) || availableCupSizes.value[0];
                    newRecord.value.cupSize = defaultCup.ratio !== undefined ? defaultCup.ratio : defaultCup.value;
                    newRecord.value.cupSizeLabel = defaultCup.label;
                }
            });
        };

        const selectDrink = (drink) => {
            newRecord.value.drinkId = drink.id;
            // Default setup
            if (drink.type === '咖啡') {
                newRecord.value.sugarLabel = '无糖';
                newRecord.value.sugar = 0;
                newRecord.value.toppings = [];
            } else {
                newRecord.value.sugarLabel = '五分糖';
                newRecord.value.sugar = 0.5;
            }
        };

        const toggleTopping = (topping) => {
            const list = newRecord.value.toppings;
            const idx = list.indexOf(topping.label);
            if (idx > -1) list.splice(idx, 1);
            else list.push(topping.label);
        };

        const saveRecord = () => {
            const drink = db.value.drinks.find(d => d.id === newRecord.value.drinkId);
            if (!drink) return;

            // Calculate Kcal
            let baseToppingsKcal = 0;
            const toppingsCount = newRecord.value.toppings.length;
            newRecord.value.toppings.forEach(tLabel => {
                const t = db.value.toppings.find(x => x.label === tLabel);
                if (t) baseToppingsKcal += t.kcal;
            });
            
            // Apply toppings discount based on count
            let toppingMultiplier = 1.0;
            if (toppingsCount === 2) toppingMultiplier = 0.5;
            else if (toppingsCount === 3) toppingMultiplier = 0.3;
            else if (toppingsCount >= 4) toppingMultiplier = 0.2;
            
            const finalToppingsKcal = baseToppingsKcal * toppingMultiplier;

            const baseDrinkKcal = drink.baseKcal + (newRecord.value.sugar * drink.sugarFactor);
            const totalKcal = (baseDrinkKcal * newRecord.value.cupSize) + finalToppingsKcal;

            // Calculate Caffeine
            const totalCaffeine = drink.baseCaffeine * newRecord.value.cupSize;

            const record = {
                id: Date.now().toString(),
                date: getTodayString(),
                time: newRecord.value.time,
                brand: newRecord.value.brand,
                name: drink.name,
                type: drink.type,
                cupSizeLabel: newRecord.value.cupSizeLabel,
                sugarLabel: newRecord.value.sugarLabel,
                temperature: newRecord.value.temperature,
                toppings: [...newRecord.value.toppings],
                kcal: totalKcal,
                caffeine: totalCaffeine
            };

            records.value.push(record);
            closeRecordModal();
        };

        const clearData = () => {
            if(confirm('确定要清空所有记录吗？手账也会清空哦！')) {
                records.value = [];
            }
        };

        const exportData = () => {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(records.value));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", "caffeLog_backup.json");
            document.body.appendChild(downloadAnchorNode); // required for firefox
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
        };

        const exportExcelDB = () => {
            if (typeof XLSX === 'undefined') {
                alert('请等待 Excel 库加载完成');
                return;
            }
            const wb = XLSX.utils.book_new();

            const brandsSheet = XLSX.utils.json_to_sheet(db.value.brands.map(b => ({ name: b })));
            XLSX.utils.book_append_sheet(wb, brandsSheet, "brands");

            const drinksSheet = XLSX.utils.json_to_sheet(db.value.drinks);
            XLSX.utils.book_append_sheet(wb, drinksSheet, "drinks");

            const sugarLevelsSheet = XLSX.utils.json_to_sheet(db.value.sugarLevels);
            XLSX.utils.book_append_sheet(wb, sugarLevelsSheet, "sugarLevels");

            const cupSizesSheet = XLSX.utils.json_to_sheet(db.value.cupSizes);
            XLSX.utils.book_append_sheet(wb, cupSizesSheet, "cupSizes");

            const tempSheet = XLSX.utils.json_to_sheet(db.value.temperatures.map(t => ({ name: t })));
            XLSX.utils.book_append_sheet(wb, tempSheet, "temperatures");

            const toppingsSheet = XLSX.utils.json_to_sheet(db.value.toppings);
            XLSX.utils.book_append_sheet(wb, toppingsSheet, "toppings");

            XLSX.writeFile(wb, "db.xlsx");
        };

        const importExcelDB = (event) => {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    
                    const newDb = {
                        brands: XLSX.utils.sheet_to_json(workbook.Sheets['brands'] || workbook.Sheets['品牌'] || {SheetNames:[]}).map(r => r.name || r.品牌),
                        drinks: XLSX.utils.sheet_to_json(workbook.Sheets['drinks'] || workbook.Sheets['饮品'] || {SheetNames:[]}).map((d, idx) => ({ ...d, id: d.id || `custom_${idx}` })),
                        sugarLevels: XLSX.utils.sheet_to_json(workbook.Sheets['sugarLevels'] || workbook.Sheets['糖度'] || {SheetNames:[]}),
                        cupSizes: XLSX.utils.sheet_to_json(workbook.Sheets['cupSizes'] || workbook.Sheets['杯型'] || {SheetNames:[]}),
                        temperatures: XLSX.utils.sheet_to_json(workbook.Sheets['temperatures'] || workbook.Sheets['温度'] || {SheetNames:[]}).map(r => r.name || r.温度),
                        toppings: XLSX.utils.sheet_to_json(workbook.Sheets['toppings'] || workbook.Sheets['小料'] || {SheetNames:[]})
                    };
                    
                    // Fallback to default if sheet parsing failed or empty
                    if (newDb.brands.length === 0) newDb.brands = DEFAULT_DB.brands;
                    if (newDb.drinks.length === 0) newDb.drinks = DEFAULT_DB.drinks;
                    if (newDb.sugarLevels.length === 0) newDb.sugarLevels = DEFAULT_DB.sugarLevels;
                    if (newDb.cupSizes.length === 0) newDb.cupSizes = DEFAULT_DB.cupSizes;
                    if (newDb.temperatures.length === 0) newDb.temperatures = DEFAULT_DB.temperatures;
                    if (newDb.toppings.length === 0) newDb.toppings = DEFAULT_DB.toppings;

                    db.value = newDb;
                    localStorage.setItem('caffeLog_db_v2', JSON.stringify(newDb));
                    alert('Excel 信息库导入成功！');
                } catch (error) {
                    console.error("Error parsing Excel", error);
                    alert('导入失败，请确保格式正确');
                }
                event.target.value = ''; // Reset input
            };
            reader.readAsArrayBuffer(file);
        };

        const resetDB = () => {
            if (confirm('确定要恢复默认信息库吗？这将覆盖您导入的自定义配置。')) {
                db.value = JSON.parse(JSON.stringify(DEFAULT_DB));
                localStorage.setItem('caffeLog_db_v2', JSON.stringify(db.value));
                alert('已恢复默认信息库！');
            }
        };

        // ECharts rendering
        let myChart = null;

        const renderChart = () => {
            if (!document.getElementById('chart-container')) return;
            if (!myChart) myChart = echarts.init(document.getElementById('chart-container'));

            const xData = [];
            const yData = [];
            
            // Generate 24 hour data points (every 15 mins)
            for (let h = 0; h < 24; h++) {
                for (let m = 0; m < 60; m += 15) {
                    const timeStr = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
                    xData.push(timeStr);
                    
                    // Calculate caffeine at this moment based on today's records
                    let currentCaff = 0;
                    const currentHourDecimal = h + m/60;

                    todayRecords.value.forEach(r => {
                        const [rh, rm] = r.time.split(':').map(Number);
                        const recordHourDecimal = rh + rm/60;
                        
                        if (currentHourDecimal >= recordHourDecimal) {
                            const hoursPassed = currentHourDecimal - recordHourDecimal;
                            // C(t) = C0 * (0.5)^(t/5)
                            const remaining = r.caffeine * Math.pow(0.5, hoursPassed / CAFFEINE_HALF_LIFE);
                            currentCaff += remaining;
                        }
                    });
                    yData.push(Math.round(currentCaff));
                }
            }

            const option = {
                grid: { top: 20, right: 10, bottom: 20, left: 30 },
                xAxis: {
                    type: 'category',
                    data: xData,
                    axisLabel: {
                        formatter: function (value) {
                            return value.endsWith(':00') && (value.startsWith('06') || value.startsWith('12') || value.startsWith('18') || value.startsWith('22')) ? value : '';
                        },
                        color: '#6090B8', // theme-blue
                        fontFamily: 'KaiTi, STKaiti, serif'
                    },
                    axisLine: { lineStyle: { color: '#6090B8', width: 2 } }, // theme-blue
                    axisTick: { show: false }
                },
                yAxis: {
                    type: 'value',
                    max: 500,
                    name: '咖啡因 (mg)',
                    nameTextStyle: { color: '#6090B8', fontFamily: 'KaiTi, STKaiti, serif' },
                    axisLabel: { color: '#6090B8', fontFamily: 'KaiTi, STKaiti, serif' },
                    splitLine: { lineStyle: { type: 'dashed', color: 'rgba(96,144,184,0.3)' } } // theme-blue semi-transparent
                },
                visualMap: {
                    show: false,
                    pieces: [
                        { gt: 0, lte: 30, color: '#6090B8' }, // theme-blue
                        { gt: 30, lte: 400, color: '#6090B8' }, // theme-blue
                        { gt: 400, color: '#e53e3e' } // red warning
                    ],
                    outOfRange: { color: '#cbd5e1' }
                },
                series: [
                    {
                        data: yData,
                        type: 'line',
                        smooth: true,
                        symbol: 'none',
                        lineStyle: { width: 3 },
                        areaStyle: {
                            opacity: 0.1
                        },
                        markLine: {
                            silent: true,
                            data: [
                                { yAxis: 400, label: { formatter: '每日上限' }, lineStyle: { color: '#e53e3e' } },
                                { yAxis: 30, label: { formatter: '睡眠警戒' }, lineStyle: { color: '#6090B8' } }
                            ]
                        },
                        markArea: {
                            silent: true,
                            itemStyle: { color: 'rgba(239, 68, 68, 0.1)' },
                            data: [
                                [ { xAxis: '22:00' }, { xAxis: '23:45' } ] // Sleep area
                            ]
                        }
                    }
                ]
            };

            myChart.setOption(option);
        };

        onMounted(() => {
            renderChart();
            window.addEventListener('resize', () => myChart && myChart.resize());
        });

        // --- AI Features (via Local Backend Proxy) ---

        const callLLM = async (messages, useJson = false) => {
            if (!userSettings.value.apiKey) {
                throw new Error('请先在“设置”页面配置 API Key');
            }

            const modelMap = {
                'openai': 'gpt-4o',
                'gemini': 'gemini-1.5-pro',
                'qwen': 'qwen-vl-plus',
                'deepseek': 'deepseek-chat'
            };
            const model = modelMap[userSettings.value.aiProvider] || 'gpt-4o';

            // Forward the request to our local Node.js proxy server
            const proxyUrl = '/api/llm';

            try {
                const response = await fetch(proxyUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        provider: userSettings.value.aiProvider,
                        apiKey: userSettings.value.apiKey,
                        baseUrl: userSettings.value.baseUrl,
                        model: model,
                        messages: messages,
                        useJson: useJson
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `HTTP 错误: ${response.status}`);
                }

                const data = await response.json();
                if (data.error) throw new Error(data.error);

                return data.choices[0].message.content;
            } catch (err) {
                if (err.message.includes('Failed to fetch')) {
                    throw new Error('无法连接到本地后端服务。\n请确保在终端运行了: npm install && npm start');
                }
                throw err;
            }
        };

        // 1. Snap & Track
        const isSnapping = ref(false);
        const handleSnapAndTrack = async (event) => {
            const file = event.target.files[0];
            if (!file) return;

            isSnapping.value = true;
            try {
                const base64Image = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const img = new Image();
                        img.onload = () => {
                            const canvas = document.createElement('canvas');
                            let width = img.width;
                            let height = img.height;
                            
                            // Compress large images
                            const MAX_SIZE = 1024;
                            if (width > height && width > MAX_SIZE) {
                                height *= MAX_SIZE / width;
                                width = MAX_SIZE;
                            } else if (height > MAX_SIZE) {
                                width *= MAX_SIZE / height;
                                height = MAX_SIZE;
                            }
                            
                            canvas.width = width;
                            canvas.height = height;
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(img, 0, 0, width, height);
                            // Output compressed base64 JPEG
                            resolve(canvas.toDataURL('image/jpeg', 0.7));
                        };
                        img.onerror = () => reject(new Error('图片加载失败'));
                        img.src = e.target.result;
                    };
                    reader.onerror = () => reject(new Error('读取图片失败'));
                    reader.readAsDataURL(file);
                });

                const prompt = `你是一个饮品小票和实拍图识别专家。
请识别图片中的饮品信息，并严格输出为 JSON 格式。
必须包含以下字段：
- brand: 品牌（如果在列表中找不到，返回"自定义"）
- name: 饮品名称
- cupSizeLabel: 杯型（中杯/大杯/超大杯等）
- temperature: 温度（冰/热/常温）
- sugarLabel: 糖度（无糖/三分糖/五分糖/七分糖/全糖）
- toppings: 小料数组（如["珍珠", "椰果"]）

可选品牌列表：${db.value.brands.join(', ')}
返回示例：{"brand":"一点点","name":"A2牛乳红茶","cupSizeLabel":"大杯","temperature":"冰","sugarLabel":"无糖","toppings":["椰果"]}
`;
                const messages = [
                    { role: "system", content: "你是一个只能输出 JSON 的 AI 助手。" },
                    { role: "user", content: [
                        { type: "text", text: prompt },
                        { type: "image_url", image_url: { url: base64Image } }
                    ]}
                ];

                // Some providers (like older DeepSeek or certain Qwen endpoints) might not fully support OpenAI's image_url object format.
                // We'll format the messages right before sending if needed in the future, but standard OpenAI format is used here.
                // For DeepSeek: Note that DeepSeek-V3/R1 currently DOES NOT support image inputs natively via the chat completion API in the same way GPT-4o does.
                // If using Qwen-VL, it should support image_url. Let's ensure the format is strictly compatible.
                const finalMessages = [
                    { role: "system", content: "你是一个只能输出 JSON 的 AI 助手。" },
                    { role: "user", content: [
                        { type: "image_url", image_url: { url: base64Image } },
                        { type: "text", text: prompt }
                    ]}
                ];

                const result = await callLLM(finalMessages, true);
                let parsed = JSON.parse(result.replace(/```json/g, '').replace(/```/g, ''));
                
                // Auto fill
                if (parsed.brand) {
                    if (!db.value.brands.includes(parsed.brand)) {
                        if (!db.value.brands.includes('自定义')) db.value.brands.push('自定义');
                        parsed.brand = '自定义';
                    }
                    selectBrand(parsed.brand);
                    await nextTick();
                }
                
                if (parsed.name) {
                    const drink = availableDrinks.value.find(d => 
                        d.name && parsed.name && (d.name.includes(parsed.name) || parsed.name.includes(d.name))
                    );
                    if (drink) {
                        selectDrink(drink);
                    } else {
                        // If drink not found, use auto-sync logic
                        // Pass the detected brand as context to the search query so the LLM doesn't guess incorrectly
                        aiSearchQuery.value = parsed.brand ? `${parsed.brand} ${parsed.name}` : parsed.name;
                        await searchNewDrink();
                    }
                }

                if (parsed.cupSizeLabel) newRecord.value.cupSizeLabel = parsed.cupSizeLabel;
                if (parsed.temperature) newRecord.value.temperature = parsed.temperature;
                if (parsed.sugarLabel) newRecord.value.sugarLabel = parsed.sugarLabel;
                if (Array.isArray(parsed.toppings)) newRecord.value.toppings = parsed.toppings;

                alert('识别成功并已自动填入！');
            } catch (err) {
                alert('识别失败：' + err.message);
            } finally {
                isSnapping.value = false;
                event.target.value = '';
            }
        };

        // 2. Auto Sync (RAG Mock)
        const aiSearchQuery = ref('');
        const isSearchingDrink = ref(false);
        const searchNewDrink = async () => {
            if (!aiSearchQuery.value) return;
            isSearchingDrink.value = true;
            try {
                const prompt = `用户查询了一个本地数据库中没有的饮品："${aiSearchQuery.value}"。
请你扮演一个营养成分检索专家（模拟 RAG 和全网检索），根据该饮品的实际成分和全网公开数据，估算或检索该饮品的营养成分。
注意：
1. 奶茶类（特别是牛乳茶、红茶、绿茶底）：通常含有茶多酚和咖啡因，请根据常见的茶叶冲泡浓度给出合理的咖啡因估算（比如大杯红茶底大概 50-80mg）。不要一律默认给 30mg。
2. 纯果茶类（无茶底）：咖啡因必须是 0。
3. 咖啡类：根据浓缩液数量合理估算（通常一杯美式/拿铁大概 150-200mg）。

返回严格的 JSON 格式：
{
  "brand": "品牌名(如果查询中没有指定，请推测，如瑞幸)",
  "name": "标准化的饮品名称(去除品牌名前缀，例如直接输出'A2牛乳红茶')",
  "type": "咖啡或奶茶",
  "baseCaffeine": 咖啡因含量(mg, 数字，请务必根据茶底/咖啡浓缩给出准确预估),
  "baseKcal": 基础热量(kcal, 数字，大杯标准量),
  "sugarFactor": 糖度系数(数字，一般每分糖增加的热量，如 50)
}`;
                const result = await callLLM([{ role: "user", content: prompt }], true);
                
                // More robust JSON extraction to handle markdown code blocks or extra text
                let jsonStr = result;
                const jsonMatch = result.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    jsonStr = jsonMatch[0];
                }
                const newDrink = JSON.parse(jsonStr);
                newDrink.id = Date.now();
                
                if (!db.value.brands.includes(newDrink.brand)) {
                    db.value.brands.push(newDrink.brand);
                }
                db.value.drinks.push(newDrink);
                localStorage.setItem('caffeLog_db_v2', JSON.stringify(db.value));
                
                selectBrand(newDrink.brand);
                await nextTick();
                selectDrink(newDrink);
                
                aiSearchQuery.value = '';
                alert(`已为您同步全网新品：${newDrink.brand} - ${newDrink.name}`);
            } catch (err) {
                alert('搜索失败：' + err.message);
            } finally {
                isSearchingDrink.value = false;
            }
        };

        // 3. AI Advisor
        const aiAdvice = ref('');
        const isGeneratingAdvice = ref(false);
        const generateAIAdvice = async () => {
            isGeneratingAdvice.value = true;
            try {
                const profile = userSettings.value;
                const stats = todayStats.value;
                const prompt = `你是一位专业的AI营养师。
用户的当前目标是：${profile.goal}。
日常偏好口味：${profile.tastePreference || '无特殊偏好'}。
用户今日已摄入热量：${stats.kcal} kcal，咖啡因：${stats.caffeine.toFixed(1)} mg。

请给出一段生动、专业的点评建议。注意：
1. 重点是“千人千面”。同样的500大卡，对减脂期用户是警告，对增肌期用户是鼓励。
2. 咖啡因上限是400mg，如果接近或超过，请提醒。
3. 如果摄入很少，可以结合他们的口味推荐他们喝点什么。
4. 控制在 150 字以内。`;
                
                aiAdvice.value = await callLLM([{ role: "user", content: prompt }]);
            } catch (err) {
                aiAdvice.value = '生成建议失败：' + err.message;
            } finally {
                isGeneratingAdvice.value = false;
            }
        };

        const aiMenuPrompt = ref('');
        const aiMenuResult = ref('');
        const isGeneratingMenu = ref(false);
        const generateSecretMenu = async () => {
            isGeneratingMenu.value = true;
            try {
                const profile = userSettings.value;
                const prompt = `用户需求：${aiMenuPrompt.value}
用户的当前目标是：${profile.goal}。

请你反向生成一个“隐藏菜单”点单话术。要求：
1. 推荐一款市面上常见的饮品（比如瑞幸、星巴克、喜茶等）。
2. 提供具体的定制要求（比如：换燕麦奶、不另外加糖、少冰等）来符合用户的目标（减脂期要求低卡）。
3. 给出直接可以给店员看的“点单话术”。
4. 控制在 100 字以内，语气幽默贴心。`;
                
                aiMenuResult.value = await callLLM([{ role: "user", content: prompt }]);
            } catch (err) {
                aiMenuResult.value = '生成菜单失败：' + err.message;
            } finally {
                isGeneratingMenu.value = false;
            }
        };

        watch(currentTab, (val) => {
            if (val === 'home') {
                nextTick(() => renderChart());
            } else if (val === 'ai' && !aiAdvice.value) {
                generateAIAdvice();
            }
        });

        return {
            db, currentTab, currentDate,
            userSettings,
            todayStats, todayRecords, warningMessage,
            calendarDays, calendarBlanks, getDayClass, showDayStats, selectedDayStats,
            isRecordModalOpen, openRecordModal, closeRecordModal, newRecord,
            availableDrinks, availableCupSizes, selectBrand, selectDrink, toggleTopping, saveRecord,
            clearData, exportData, exportExcelDB, importExcelDB, resetDB,
            // AI returns
            isSnapping, handleSnapAndTrack,
            aiSearchQuery, isSearchingDrink, searchNewDrink,
            aiAdvice, isGeneratingAdvice, generateAIAdvice,
            aiMenuPrompt, aiMenuResult, isGeneratingMenu, generateSecretMenu
        };
    }
}).mount('#app');