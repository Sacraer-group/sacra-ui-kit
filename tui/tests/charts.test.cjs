/* Run: node tests/charts.test.cjs — no dependencies. */
const assert=require('node:assert/strict');
const C=require('../assets/charts.js');
let n=0;
function check(name,fn){fn();n++;console.log('OK '+name);}
check('Zero is a sample, not a missing value',()=>assert.deepEqual(C.segments([{t:0,v:0},{t:1000,v:0}],'v',1000),[[[0,0],[1000,0]]]));
check('Null splits segments',()=>assert.equal(C.segments([{t:0,v:1},{t:1,v:null},{t:2,v:2}],'v',10).length,2));
check('NaN and Infinity are missing',()=>assert.deepEqual(C.segments([{t:0,v:NaN},{t:1,v:Infinity}],'v',10),[]));
check('Over 20 seconds splits temporal continuity',()=>assert.equal(C.segments([{t:0,v:1},{t:20001,v:1}],'v',30000).length,2));
check('Exactly 20 seconds remains continuous',()=>assert.equal(C.segments([{t:0,v:1},{t:20000,v:1}],'v',30000).length,1));
check('Time window filters old samples',()=>assert.deepEqual(C.segments([{t:0,v:1},{t:3000,v:2},{t:4000,v:3}],'v',1000),[[[0,2],[1000,3]]]));
const base={width:41,height:17,xMax:4,bounds:[0,100],background:[21,25,31],grid:null,thick:true};
check('Zero draws on baseline',()=>{const r=C.raster({...base,series:[{color:[242,204,77],segments:[[[0,0],[4,0]]]}]});assert.equal(r.mask[16*41+20],1);assert.equal(r.mask[8*41+20],0);});
check('Raster does not bridge missing data',()=>{const r=C.raster({...base,series:[{color:[242,204,77],segments:[[[0,0],[1,0]],[[3,100],[4,100]]]}]});assert.equal(r.mask[8*41+20],0);assert.equal(r.mask[16*41+5],1);assert.equal(r.mask[35],1);});
check('Two series retain independent labels',()=>{const r=C.raster({...base,series:[{color:[1,2,3],segments:[[[0,0],[4,0]]]},{color:[4,5,6],segments:[[[0,100],[4,100]]]}]});assert.equal(r.mask[16*41+20],1);assert.equal(r.mask[20],2);assert(C.ascii(r).includes('+'));});
check('Budget bounds work',()=>assert.throws(()=>C.raster({...base,width:99999,height:99999,series:[]}),RangeError));
check('Empty spark is unavailable',()=>assert.equal(C.spark([null,null]),'—'));
check('Spark gaps and zero preserved',()=>assert.equal(C.spark([0,null,0]),'▁ ▁'));
check('ASCII spark mapping matches ultra-mog',()=>assert.equal(C.spark([0,1,2,3,4,5,6,7],8,true),'.:-=+*#@'));
check('Bars clamp finite values',()=>{assert.equal(C.bar(-1,4,true),'....');assert.equal(C.bar(140,4,true),'####');assert.equal(C.bar(null,4,true),'....');});
check('Seeded signal repeatable',()=>assert.deepEqual(C.sample(1800000),C.sample(1800000)));
console.log(`${n}/${n} chart checks passed.`);
