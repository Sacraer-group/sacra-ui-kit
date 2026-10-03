import {Client, text, panel, column, block, type Block, type Options} from '../javascript/index.mjs';
const view: Block = column([panel('NAME', text('hello')),block('meter',{value:0,max:100})]);
const options: Options = {width:80,height:24,theme:'nord',color:'none'};
async function sample() {const c=new Client();try {const f=await c.render(view,options); return f.lines.join('\n');} finally {c.close();}}
void sample;
