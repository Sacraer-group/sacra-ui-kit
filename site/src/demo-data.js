/* Synthetic data only. Never use this file as a telemetry source. */
(function(g){'use strict';
const META=[
 ['line','Линия + область','Время отклика / два перцентиля','time','мс'],
 ['bar','Столбцы','Сравнение пакетных операций','compare','задач'],
 ['stacked','Накопленные столбцы','Состав результатов по дням','compare','задач'],
 ['candlestick','Свечи OHLC','Открытие / максимум / минимум / закрытие','time','условный индекс'],
 ['scatter','Точечная диаграмма','Объём × время обработки','compare','мс'],
 ['radar','Радар','Шесть нормированных измерений','compare','баллов'],
 ['heatmap','Тепловая карта','Нагрузка по дням и часам','time','задач'],
 ['donut','Кольцевая диаграмма','Распределение ресурсов','structure','МБ'],
 ['gauge','Индикатор / gauge','Измерение с порогом предупреждения','compare','%'],
 ['sankey','Потоки / Sankey','Баланс входов и выходов','structure','док.'],
 ['treemap','Карта площадей','Объём компонентов','structure','МБ'],
 ['sparkline','Мини-график / KPI','Значение и краткая история','time','задач/с']
];
function spec(type,rev=0){const meta=META.find(x=>x[0]===type);if(!meta)throw new Error('Unknown demo type');const o={type,title:meta[1],description:'Синтетический набор / не реальные измерения',unit:meta[4],data:[]},f=1+rev*.04;
 if(type==='line'){o.series=[{key:'p95',label:'p95',color:'accent'},{key:'p50',label:'p50',color:'muted',dash:true}];o.data=Array.from({length:13},(_,i)=>({label:String(i).padStart(2,'0')+':00',p50:Math.round((35+9*Math.sin(i*.6+rev)+i)*f),p95:Math.round((82+21*Math.sin(i*.65+rev*.35)+i*3)*f)}));}
 if(type==='bar')o.data=['OCR','JSON','CSV','PDF','QA','Sync'].map((label,i)=>({label,value:Math.round(([84,52,69,107,38,63][i]+rev*3)*f)}));
 if(type==='stacked'){o.series=[{key:'done',label:'✓ Готово',color:'success'},{key:'review',label:'! Проверка',color:'accent'},{key:'error',label:'× Ошибка',color:'danger'}];o.data=['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map((label,i)=>({label,done:Math.round((28+i*6+9*Math.sin(i+rev))*f),review:6+(i+rev)%7,error:2+(i+rev)%4}));}
 if(type==='candlestick'){let prev=100+rev*2;o.data=Array.from({length:12},(_,i)=>{let open=prev,close=Math.round((open+Math.sin(i*1.7+rev)*8+2)*10)/10;prev=close;return {label:String(i+1).padStart(2,'0'),open,high:Math.round((Math.max(open,close)+3+(i%3))*10)/10,low:Math.round((Math.min(open,close)-2-(i%4))*10)/10,close};});}
 if(type==='scatter'){o.threshold=70;o.xTitle='Объём, МБ';o.data=Array.from({length:16},(_,i)=>{let x=Math.round(5+i*5+Math.cos(i+rev)*3),y=Math.round(15+i*4+14*Math.sin(i*1.9+rev));return {label:'S'+String(i+1).padStart(2,'0'),x,y,status:y>70?'review':'pass'};});}
 if(type==='radar')o.data=['Полнота','Точность','Формат','Скорость','Память','Стабильн.'].map((label,i)=>({label,value:Math.min(98,[82,71,91,68,77,85][i]+(rev*3)%11)}));
 if(type==='heatmap')o.data=['Пн','Вт','Ср','Чт','Пт'].flatMap((day,j)=>Array.from({length:12},(_,i)=>({day,hour:String(i*2).padStart(2,'0'),value:Math.round((7+Math.abs(Math.sin(i*.44+j*.5+rev*.5))*29)*f)})));
 if(type==='donut')o.data=[['Модели',640],['Кеш',220],['Индексы',110],['Логи',54]].map(([label,value],i)=>({label,value:Math.round(value*(1+rev*.04+i*.01))}));
 if(type==='gauge')o.data=[{label:'Занятость',value:Math.min(100,68+rev*5),max:100}];
 if(type==='sankey'){const valid=72-(rev%4)*3,review=20+(rev%4)*2,errors=100-valid-review;o.nodes=[{id:'input',label:'Загрузка',depth:0},{id:'ocr',label:'OCR',depth:1},{id:'json',label:'JSON',depth:2,color:'success'},{id:'review',label:'Проверка',depth:2,color:'accent'},{id:'error',label:'Ошибка',depth:2,color:'danger'}];o.data=[{source:'input',target:'ocr',value:100},{source:'ocr',target:'json',value:valid},{source:'ocr',target:'review',value:review},{source:'ocr',target:'error',value:errors}];}
 if(type==='treemap')o.data=[['Модели',420],['Кеш',240],['Данные',180],['Логи',90],['Индекс',50],['Прочее',20]].map(([label,value],i)=>({label,value:Math.round(value*(1+rev*.03+(i%2)*.03))}));
 if(type==='sparkline')o.data=Array.from({length:18},(_,i)=>({label:String(12+Math.floor(i/6)).padStart(2,'0')+':'+String((i%6)*10).padStart(2,'0'),value:Math.round((24+i*1.4+9*Math.sin(i*.6+rev))*f)}));
 return o;
}
g.SacraDemoData={meta:META,spec};
})(window);
