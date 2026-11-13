const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
function load(relative){const file=path.resolve(relative),m=new Module(file,module);m.paths=module.paths;m.require=id=>{
 if(id==='@/components/catalogue/CatalogueProvider')return {useCatalogue:()=>({items:[],loading:false,error:null})};
 if(id==='@/lib/upload-venue-photo')return {uploadVenuePhoto:async()=>{throw Error('Unexpected upload')}};
 if(id==='@/components/ui/ContextHelp'||id==='@/components/design/LookReportPanel')return {__esModule:true,default:()=>null};
 if(id.startsWith('@/')||id.startsWith('.')){const base=id.startsWith('@/')?path.resolve(id.slice(2)):path.resolve(path.dirname(file),id);return load(fs.existsSync(base+'.tsx')?base+'.tsx':base+'.ts');}
 return require(id);
};m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,file);return m.exports;}
const RenderStage=load('components/design/RenderStage.tsx').default;
const noop=()=>{},indoor='/img/venues/manor_orangery.png',garden='/img/venues/outdoor_garden.jpg';
const base={venue:{id:'manor_orangery',name:'Indoor event venue',image:indoor},uploadedImages:[],style:{id:'garden_romance',name:'Garden Romance'},styleName:'Current event style',renderUrl:'https://example.test/owned-output.jpg',renderId:'saved-outdoor',versions:[{id:'saved-outdoor',url:'https://example.test/owned-output.jpg',originalUrl:garden,styleName:'Saved outdoor preview',look:{environment:'outdoor',tentColour:'sand',items:[],excluded:[],leftPlain:[]}}],itemIds:[],guestCount:75,weddingDate:'',isSaved:true,onRender:noop,onStyle:noop,onVenue:noop,onAddAngle:noop,onRemoveAngle:noop,onWeddingDate:noop,onDeleteVersion:noop,onToggleSave:noop};
const render=props=>renderToStaticMarkup(React.createElement(RenderStage,{...base,...props}));
test('saved preview compares with its own original, not the current event venue',()=>{const html=render({});assert.match(html,/src="\/img\/venues\/outdoor_garden.jpg"/);assert.doesNotMatch(html,/src="\/img\/venues\/manor_orangery.png"/);});
test('saved preview context wins over another event environment and label',()=>{const html=render({environment:'indoor',tentColour:'white'});assert.match(html,/aria-pressed="true"[^>]*>Outdoor space/);assert.match(html,/Saved outdoor preview/);assert.doesNotMatch(html,/Current event style/);assert.doesNotMatch(html,/Choose a photo of your outdoor space/);});
test('a new preview without a render continues to use the editable event source',()=>{const html=render({renderId:null,renderUrl:null,environment:'indoor'});assert.match(html,/src="\/img\/venues\/manor_orangery.png"/);assert.doesNotMatch(html,/src="\/img\/venues\/outdoor_garden.jpg"/);});
