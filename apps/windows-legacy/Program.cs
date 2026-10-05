// SPDX-License-Identifier: LicenseRef-ChemoDose-Academic-NonCommercial
using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Text;
using System.Web.Script.Serialization;
using System.Windows.Forms;
[assembly: AssemblyVersion("1.1.0.0")]
[assembly: AssemblyFileVersion("1.1.0.0")]
[assembly: AssemblyInformationalVersion("1.1.0-preview")]
[assembly: AssemblyCopyright("版权所有 GitHub @jiayi-sketch；仅限于学术交流，严禁商业用途。")]
namespace ChemoDose.Legacy {
 static class Program {
  [STAThread] static void Main(string[] args) {
   AppDomain.CurrentDomain.AssemblyResolve += delegate(object sender,ResolveEventArgs e) {
    if(new AssemblyName(e.Name).Name!="Jint")return null;
    using(var s=Assembly.GetExecutingAssembly().GetManifestResourceStream("Jint.dll")) {
     var bytes=new byte[(int)s.Length]; int offset=0,n; while((n=s.Read(bytes,offset,bytes.Length-offset))>0)offset+=n;
     return Assembly.Load(bytes);
    }
   };
   Start(args);
  }
  [MethodImpl(MethodImplOptions.NoInlining)] static void Start(string[] args) {
   Application.EnableVisualStyles(); Application.SetCompatibleTextRenderingDefault(false);
   try { Application.Run(new LegacyWindow(args)); }
   catch(Exception e) { MessageBox.Show("启动失败 / Startup failed:\r\n"+e.Message,"ChemoDose"); Environment.ExitCode=1; }
  }
 }
 sealed class Choice {
  public string Key,Label; public Choice(string k,string l){Key=k;Label=l;}
  public override string ToString(){return Label;}
 }
 sealed class LegacyWindow : Form {
  const string Version="1.1.0-preview";
  readonly JavaScriptSerializer json=new JavaScriptSerializer {MaxJsonLength=2000000};
  readonly EngineBridge bridge=new EngineBridge(EngineBridge.Resource("engine.js"));
  readonly Dictionary<Control,string> labels=new Dictionary<Control,string>();
  readonly Dictionary<string,ComboBox> fields=new Dictionary<string,ComboBox>();
  readonly Dictionary<string,TextBox> reports=new Dictionary<string,TextBox>();
  readonly Dictionary<string,ComboBox> alternatives=new Dictionary<string,ComboBox>();
  readonly ComboBox language=new ComboBox(), section=new ComboBox(), subtype=new ComboBox();
  readonly ComboBox phase=new ComboBox(), menopause=new ComboBox(), surgery=new ComboBox(), nodes=new ComboBox();
  readonly TextBox query=new TextBox(), height=new TextBox(), weight=new TextBox(), renal=new TextBox(), reviewer=new TextBox(), correction=new TextBox();
  readonly TextBox detail=Area(true), output=Area(true), evidence=Area(true);
  readonly CheckBox confirmed=new CheckBox(), renalConfirmed=new CheckBox(), reportReviewed=new CheckBox(), specialReviewed=new CheckBox();
  readonly ListBox entries=new ListBox {HorizontalScrollbar=true}, matches=new ListBox {HorizontalScrollbar=true};
  readonly FlowLayoutPanel alternativesPanel=new FlowLayoutPanel {Dock=DockStyle.Fill,AutoSize=true,WrapContents=true};
  readonly TabControl tabs=new TabControl {Dock=DockStyle.Fill};
  readonly Button copy=new Button();
  readonly Dictionary<string,object> catalogue;
  readonly object[] allEntries;
  readonly string[] fieldKeys={"ER","PR","IHC","ISH"};
  readonly string[] sourceKeys={"biopsy","postop","ihc","fish"};
  Dictionary<string,object> selected,parsed,lastMatch;
  string currentLanguage="zh-Hans",summary;
  bool updating;
  readonly string[] args;
  static TextBox Area(bool readOnly) {return new TextBox {Multiline=true,ReadOnly=readOnly,ScrollBars=ScrollBars.Both,WordWrap=true,Dock=DockStyle.Fill,MaxLength=40000};}
  Dictionary<string,object> D(object o){return (Dictionary<string,object>)o;}
  object[] A(object o){return (object[])o;}
  string S(Dictionary<string,object> d,string k){return d.ContainsKey(k)&&d[k]!=null?Convert.ToString(d[k]):"";}
  object Call(object request){return json.DeserializeObject(bridge.Call(json.Serialize(request)));}
  string T(string text){return (string)Call(new {op="translate",text=text,language=currentLanguage});}
  Control Labelled(Control c,string text){labels[c]=text;c.Text=T(text);return c;}
  Label Label(string text){return (Label)Labelled(new Label {AutoSize=true,MaximumSize=new Size(700,0),Margin=new Padding(4,7,4,4)},text);}
  Button Button(string text,Action action){var b=(Button)Labelled(new Button {AutoSize=true,MinimumSize=new Size(90,30),Margin=new Padding(4)},text);b.Click+=(s,e)=>Guard(action);return b;}
  void Guard(Action action){try{action();}catch(Exception e){InvalidateDose();MessageBox.Show(this,e.Message,T("请核对"),MessageBoxButtons.OK,MessageBoxIcon.Warning);}}
  FlowLayoutPanel Flow(){return new FlowLayoutPanel {Dock=DockStyle.Fill,AutoSize=true,WrapContents=true,Padding=new Padding(3)};}
  TableLayoutPanel Table(){return new TableLayoutPanel {Dock=DockStyle.Fill,ColumnCount=1,AutoScroll=true,Padding=new Padding(6)};}
  void Row(TableLayoutPanel t,Control c,bool fill){int row=t.RowCount++;t.RowStyles.Add(new RowStyle(fill?SizeType.Percent:SizeType.AutoSize,fill?100:0));t.Controls.Add(c,0,row);}
  void Input(FlowLayoutPanel p,string title,TextBox input,int width){p.Controls.Add(Label(title));input.Width=width;p.Controls.Add(input);input.TextChanged+=(s,e)=>{if(input==height||input==weight||input==renal)renalConfirmed.Checked=false;InvalidateDose();};}
  void Options(ComboBox box,string[] keys,string[] text,string keep) {
   box.DropDownStyle=ComboBoxStyle.DropDownList;box.Width=185;box.Items.Clear();
   for(int i=0;i<keys.Length;i++)box.Items.Add(new Choice(keys[i],T(text[i])));
   int index=Array.IndexOf(keys,keep);box.SelectedIndex=index>=0?index:0;
  }
  string Key(ComboBox box){return box.SelectedItem is Choice?((Choice)box.SelectedItem).Key:"";}
  void ContextOptions() {
   Options(phase,new[]{"","neo","adjuvant","post-neo"},new[]{"请选择","术前新辅助治疗","术后辅助治疗","新辅助后衔接治疗"},Key(phase));
   Options(menopause,new[]{"","pre","post","uncertain","na"},new[]{"请选择","绝经前","绝经后","不确定","不适用"},Key(menopause));
   Options(surgery,new[]{"","none","mastectomy","radical","conserving"},new[]{"请选择","尚未手术","全乳切除","根治术","保乳手术"},Key(surgery));
   Options(nodes,new[]{"","positive","negative"},new[]{"请选择","阳性","阴性"},Key(nodes));
   foreach(string k in fieldKeys) {
    string[] keys=k=="ER"?new[]{"unknown","negative","positive","low","conflict"}:k=="IHC"?new[]{"unknown","0","1+","2+","3+","conflict"}:new[]{"unknown","negative","positive","conflict"};
    Options(fields[k],keys,keys.Select(v=>ValueLabel(v)).ToArray(),Key(fields[k]));
   }
  }
  string ValueLabel(string v){switch(v){case "unknown":return "未明确";case "negative":return "阴性";case "positive":return "阳性";case "low":return "低表达阳性";case "conflict":return "结果冲突";default:return v;}}
  void InvalidateDose(){summary=null;output.Clear();copy.Enabled=false;if(!updating)confirmed.Checked=false;}
  void InvalidateMatch(){lastMatch=null;matches.Items.Clear();reportReviewed.Checked=false;specialReviewed.Checked=false;InvalidateDose();}
  void ReportsChanged(){if(updating)return;parsed=null;evidence.Clear();InvalidateMatch();}
  public LegacyWindow(string[] arguments) {
   args=arguments; catalogue=D(Call(new {op="catalogue"}));allEntries=A(catalogue["regimens"]).Concat(A(catalogue["referenceCards"])).ToArray();
   Font=new Font("Tahoma",9);ClientSize=new Size(1100,820);MinimumSize=new Size(780,600);AutoScaleMode=AutoScaleMode.Font;StartPosition=FormStartPosition.CenterScreen;
   var root=Table();Controls.Add(root);var top=Flow();
   language.DropDownStyle=ComboBoxStyle.DropDownList;language.Items.AddRange(new object[]{new Choice("zh-Hans","简体中文"),new Choice("zh-Hant","繁體中文"),new Choice("en","English")});language.Width=145;
   language.SelectedIndex=0;top.Controls.Add(language);top.Controls.Add(Button("清除本次病例",ClearCase));top.Controls.Add(Button("查看授权",()=>MessageBox.Show(this,EngineBridge.Resource("LICENSE.txt"),T("非商业学术授权"))));
   top.Controls.Add(Button("第三方许可",()=>{using(var f=new Form {Text=T("第三方许可"),Size=new Size(700,520),StartPosition=FormStartPosition.CenterParent}){var text=Area(true);text.Text=EngineBridge.Resource("Jint-LICENSE.txt");f.Controls.Add(text);f.ShowDialog(this);}}));
   Row(root,top,false);Row(root,Label("仅限于学术交流，严禁商业用途\n版权所有 GitHub @jiayi-sketch"),false);
   Row(root,Label("目录完成扫描页录入核对；未经独立临床验证。"),false);
   Row(root,tabs,true);BuildCatalogue();BuildReports();
   language.SelectedIndexChanged+=(s,e)=>ChangeLanguage();
   string pref=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"ChemoDose","legacy-language.txt");
   if(!args.Contains("--self-test"))try{if(File.Exists(pref)&&new FileInfo(pref).Length<30){string saved=File.ReadAllText(pref).Trim();for(int i=0;i<language.Items.Count;i++)if(((Choice)language.Items[i]).Key==saved)language.SelectedIndex=i;}}catch(IOException){}catch(UnauthorizedAccessException){}
   ChangeLanguage();Shown+=(s,e)=>{if(args.Contains("--self-test"))BeginInvoke(new Action(SelfTest));};
  }
  void BuildCatalogue() {
   var tab=(TabPage)Labelled(new TabPage(),"内置方案");tabs.TabPages.Add(tab);var table=Table();tab.Controls.Add(table);
   var filters=Flow();filters.Controls.Add(Label("治疗栏目"));filters.Controls.Add(section);filters.Controls.Add(Label("受体分型"));filters.Controls.Add(subtype);Input(filters,"搜索",query,190);Row(table,filters,false);
   var split=new SplitContainer {Dock=DockStyle.Fill,SplitterDistance=350,Size=new Size(1000,370)};entries.Dock=DockStyle.Fill;split.Panel1.Controls.Add(entries);split.Panel2.Controls.Add(detail);Row(table,split,true);
   entries.SelectedIndexChanged+=(s,e)=>{if(!updating&&entries.SelectedItem is Choice)SelectEntry(((Choice)entries.SelectedItem).Key);};
   section.SelectedIndexChanged+=(s,e)=>{if(!updating)FilterEntries();};subtype.SelectedIndexChanged+=(s,e)=>{if(!updating)FilterEntries();};query.TextChanged+=(s,e)=>{if(!updating)FilterEntries();};
   var inputs=Flow();Input(inputs,"身高（cm）",height,65);Input(inputs,"体重（kg）",weight,65);Input(inputs,"肾功能（mL/min）",renal,65);Input(inputs,"本次核对人",reviewer,125);Row(table,inputs,false);
   Labelled(renalConfirmed,"请确认肾功能参数的单位和适用性。");renalConfirmed.AutoSize=true;renalConfirmed.CheckedChanged+=(s,e)=>InvalidateDose();Row(table,renalConfirmed,false);
   Row(table,alternativesPanel,false);Labelled(confirmed,"请先核对所选方案、分阶段用药及本次参数，然后勾选确认。");confirmed.AutoSize=true;confirmed.CheckedChanged+=(s,e)=>{summary=null;output.Clear();copy.Enabled=false;};Row(table,confirmed,false);
   var actions=Flow();actions.Controls.Add(Button("计算",Calculate));Labelled(copy,"复制核对单");copy.AutoSize=true;copy.Enabled=false;copy.Click+=(s,e)=>Guard(()=>{if(summary!=null)Clipboard.SetText(summary);});actions.Controls.Add(copy);Row(table,actions,false);
   output.MinimumSize=new Size(0,135);Row(table,output,false);
  }
  void BuildReports() {
   var tab=(TabPage)Labelled(new TabPage(),"报告识别与病理匹配");tabs.TabPages.Add(tab);var table=Table();tab.Controls.Add(table);
   Row(table,Label("仅识别粘贴的报告文字，不含照片或扫描 PDF 的 OCR。"),false);
   var sourceTabs=new TabControl {Dock=DockStyle.Fill,Height=160};string[] titles={"穿刺/术前病理","术后大病理","免疫组化","HER2 FISH/ISH"};
   for(int i=0;i<sourceKeys.Length;i++){var page=(TabPage)Labelled(new TabPage(),titles[i]);var box=Area(false);reports[sourceKeys[i]]=box;box.TextChanged+=(s,e)=>ReportsChanged();page.Controls.Add(box);sourceTabs.TabPages.Add(page);}Row(table,sourceTabs,false);
   Row(table,Button("识别报告",Parse),false);var values=Flow();foreach(string k in fieldKeys){values.Controls.Add(Label(k));var combo=new ComboBox();fields[k]=combo;values.Controls.Add(combo);combo.SelectedIndexChanged+=(s,e)=>{if(!updating)InvalidateMatch();};}Row(table,values,false);
   evidence.Height=110;Row(table,evidence,false);var contexts=Flow();contexts.Controls.Add(Label("治疗阶段"));contexts.Controls.Add(phase);contexts.Controls.Add(Label("绝经状态"));contexts.Controls.Add(menopause);contexts.Controls.Add(Label("已完成术式"));contexts.Controls.Add(surgery);contexts.Controls.Add(Label("淋巴结状态"));contexts.Controls.Add(nodes);Row(table,contexts,false);
   foreach(var c in new[]{phase,menopause,surgery,nodes})c.SelectedIndexChanged+=(s,e)=>{if(!updating)InvalidateMatch();};
   var reason=Flow();Input(reason,"人工修正依据",correction,420);correction.TextChanged+=(s,e)=>{if(!updating)InvalidateMatch();};Row(table,reason,false);
   Labelled(reportReviewed,"请逐项核对同一患者、同一病灶及同一取材时点的报告。");reportReviewed.AutoSize=true;Row(table,reportReviewed,false);
   Labelled(specialReviewed,"低表达或不常见受体组合需要专项复核确认。");specialReviewed.AutoSize=true;Row(table,specialReviewed,false);
   foreach(var c in new[]{reportReviewed,specialReviewed})c.CheckedChanged+=(s,e)=>{lastMatch=null;matches.Items.Clear();InvalidateDose();};
   Row(table,Button("匹配方案目录",Match),false);Row(table,Label("仅按已核对的阶段和受体分型检索目录，不判断治疗指征、风险或患者适用性。"),false);
   matches.Dock=DockStyle.Fill;Row(table,matches,true);Row(table,Button("打开所选目录条目",()=>{if(lastMatch==null||!(matches.SelectedItem is Choice))throw new Exception(T("请选择"));SelectEntry(((Choice)matches.SelectedItem).Key);tabs.SelectedIndex=0;}),false);
  }
  void ChangeLanguage() {
   updating=true;currentLanguage=Key(language);foreach(var pair in labels)pair.Key.Text=T(pair.Value);
   Text=T("乳腺癌剂量计算")+" · "+Version+" · Windows x86";
   var sections=allEntries.Select(o=>S(D(o),"section")).Distinct().ToArray();
   var subtypes=allEntries.Select(o=>S(D(o),"subtype")).Distinct().ToArray();
   Options(section,new[]{""}.Concat(sections).ToArray(),new[]{"全部"}.Concat(sections).ToArray(),Key(section));
   Options(subtype,new[]{""}.Concat(subtypes).ToArray(),new[]{"全部"}.Concat(subtypes).ToArray(),Key(subtype));
   ContextOptions();updating=false;FilterEntries();if(parsed!=null)ShowEvidence();InvalidateMatch();
   if(!args.Contains("--self-test"))try {string pref=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"ChemoDose","legacy-language.txt");Directory.CreateDirectory(Path.GetDirectoryName(pref));File.WriteAllText(pref,currentLanguage,Encoding.UTF8);}catch(IOException){}catch(UnauthorizedAccessException){}
  }
  void FilterEntries() {
   string previous=selected==null?"":S(selected,"id");updating=true;entries.Items.Clear();
   foreach(var o in allEntries){var r=D(o);string searchable=S(r,"name")+" "+S(r,"subtype");if(r.ContainsKey("drugs"))searchable+=" "+String.Join(" ",A(r["drugs"]).Select(d=>S(D(d),"name")).ToArray());
    if((Key(section)==""||Key(section)==S(r,"section"))&&(Key(subtype)==""||Key(subtype)==S(r,"subtype"))&&(query.Text.Trim()==""||(searchable+" "+T(searchable)).IndexOf(query.Text.Trim(),StringComparison.OrdinalIgnoreCase)>=0))entries.Items.Add(new Choice(S(r,"id"),T(S(r,"name"))));}
   updating=false;selected=null;detail.Clear();alternatives.Clear();alternativesPanel.Controls.Clear();InvalidateDose();
   for(int i=0;i<entries.Items.Count;i++)if(((Choice)entries.Items[i]).Key==previous){entries.SelectedIndex=i;break;}
  }
  string Source(Dictionary<string,object> r){return T((string)Call(new {op="source",entry=r}));}
  void SelectEntry(string id) {
   selected=allEntries.Select(D).First(r=>S(r,"id")==id);InvalidateDose();alternatives.Clear();alternativesPanel.Controls.Clear();
   var text=new List<string>{T(S(selected,"name")),T(S(selected,"section"))+" / "+T(S(selected,"subtype")),T(S(selected,"level")),T(S(selected,"eligibility")),T(S(selected,"notes")),T(S(selected,"body")),Source(selected)};
   if(selected.ContainsKey("drugs"))foreach(var o in A(selected["drugs"])) {
    var d=D(o);text.Add("["+T(S(d,"phaseLabel"))+"] "+T(S(d,"name"))+"\r\n"+T((string)Call(new {op="standard",drug=d}))+"\r\n"+T(S(d,"schedule"))+"; "+T(S(d,"duration"))+"\r\n"+T(S(d,"note"))+"\r\n"+Source(d));
    if(S(d,"kind")=="fixed_alt") {alternativesPanel.Controls.Add(Label(T(S(d,"name"))));var c=new ComboBox();alternatives[S(d,"id")]=c;var schedules=A(d["schedules"]).Select(Convert.ToString).ToArray();Options(c,new[]{"","0","1"},new[]{"请选择",schedules[0],schedules[1]},"");c.SelectedIndexChanged+=(s,e)=>InvalidateDose();alternativesPanel.Controls.Add(c);}
   }
   detail.Text=String.Join("\r\n\r\n",text.ToArray());
  }
  object NumberInput(TextBox input){double value;if(String.IsNullOrWhiteSpace(input.Text))return null;return Double.TryParse(input.Text,System.Globalization.NumberStyles.Float,System.Globalization.CultureInfo.InvariantCulture,out value)?(object)value:"invalid";}
  void Calculate() {
   InvalidateOutput();if(selected==null)throw new Exception(T("请选择一个内置剂量方案。指南摘要不生成剂量。"));
   var choices=new Dictionary<string,object>();foreach(var a in alternatives)if(Key(a.Value)!="")choices[a.Key]=Int32.Parse(Key(a.Value));
   var inputs=new {heightCm=NumberInput(height),weightKg=NumberInput(weight),renalFunction=new {value=NumberInput(renal),unit="mL/min",confirmed=renalConfirmed.Checked},alternatives=choices};
   var result=D(Call(new {op="dose",id=S(selected,"id"),inputs=inputs,acknowledgement=new {confirmed=confirmed.Checked,reviewer=reviewer.Text}}));
   if(S(result,"status")!="ok")throw new Exception(String.Join("\r\n",A(result["issues"]).Select(o=>T(S(D(o),"message"))).ToArray()));
   var lines=new List<string>{T("乳腺癌剂量计算")+" · "+Version,T("算术核对单（非处方）"),T(S(selected,"name")),Source(selected),T("本次核对人")+": "+reviewer.Text,DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"),T("身高（cm）")+": "+height.Text+"; "+T("体重（kg）")+": "+weight.Text};
   if(A(selected["drugs"]).Any(o=>S(D(o),"kind")=="auc"))lines.Add(T("肾功能（mL/min）")+": "+renal.Text);
   foreach(var row in A(result["rows"])) {var r=D(row);var d=A(selected["drugs"]).Select(D).First(v=>S(v,"id")==S(r,"drugId"));lines.Add("["+T(S(d,"phaseLabel"))+"] "+T(S(d,"name"))+"\r\n"+T((string)Call(new {op="quantity",result=r["result"]}))+"\r\n"+T(S(d,"schedule"))+"; "+T(S(d,"duration"))+"\r\n"+Source(d));}
   if(lastMatch!=null && A(lastMatch["matches"]).Any(o=>S(D(o),"id")==S(selected,"id"))) { lines.Add(T("报告识别与病理匹配")+": "+T(S(lastMatch,"subtype"))); foreach(var k in fieldKeys)lines.Add(k+": "+T(ValueLabel(Key(fields[k])))); if(!String.IsNullOrWhiteSpace(correction.Text))lines.Add(T("人工修正依据")+": "+correction.Text); }
   lines.Add(T("数值为每次给药量；不相加各药或各阶段。区间保留，不自动取中值。"));lines.Add(T("显示保留2位小数；计算使用未取整数值。未处理临床取整、减量、累计上限或患者适用性。"));lines.Add(T("目录完成扫描页录入核对；未经独立临床验证。"));
   summary=String.Join("\r\n\r\n",lines.ToArray());output.Text=summary;copy.Enabled=true;
  }
  void InvalidateOutput(){summary=null;output.Clear();copy.Enabled=false;}
  Dictionary<string,object> Sources(){return reports.ToDictionary(p=>p.Key,p=>(object)p.Value.Text);}
  void Parse() {
   InvalidateMatch();parsed=null;evidence.Clear();var next=D(Call(new {op="parse",sources=Sources()}));parsed=next;updating=true;
   foreach(var k in fieldKeys){string v=S(D(D(parsed["fields"])[k]),"value");for(int i=0;i<fields[k].Items.Count;i++)if(((Choice)fields[k].Items[i]).Key==v)fields[k].SelectedIndex=i;}
   correction.Clear();updating=false;ShowEvidence();
  }
  void ShowEvidence() {
   if(parsed==null)return;var lines=new List<string>();foreach(var pair in D(parsed["fields"])) {var field=D(pair.Value);lines.Add(pair.Key+": "+T(ValueLabel(S(field,"value"))));foreach(var o in A(field["evidence"])){var e=D(o);lines.Add("["+S(e,"source")+"] "+S(e,"text"));}}
   evidence.Text=String.Join("\r\n",lines.ToArray());
  }
  void Match() {
   lastMatch=null;matches.Items.Clear();InvalidateDose();var values=fields.ToDictionary(p=>p.Key,p=>(object)Key(p.Value));
   var context=new {phase=Key(phase),menopause=Key(menopause),surgery=Key(surgery),nodes=Key(nodes),reviewed=reportReviewed.Checked,specialReviewed=specialReviewed.Checked,correctionReason=correction.Text};
   var result=D(Call(new {op="match",parsed=parsed,values=values,context=context}));
   if(S(result,"status")!="ok")throw new Exception(String.Join("\r\n",A(result["issues"]).Select(o=>T(Convert.ToString(o))).ToArray()));
   lastMatch=result;foreach(var o in A(result["matches"]).Concat(A(result["references"]))) {var r=D(o);matches.Items.Add(new Choice(S(r,"id"),T(S(r,"name"))));}
   evidence.Text+="\r\n\r\n"+T(S(result,"subtype"))+"\r\n"+String.Join("\r\n",A(result["notes"]).Select(o=>T(Convert.ToString(o))).ToArray());
  }
  void ClearCase() {
   updating=true;foreach(var box in reports.Values)box.Clear();foreach(var box in new[]{height,weight,renal,reviewer,correction})box.Clear();parsed=null;evidence.Clear();foreach(var c in fields.Values)c.SelectedIndex=0;foreach(var c in new[]{phase,menopause,surgery,nodes})c.SelectedIndex=0;foreach(var c in alternatives.Values)c.SelectedIndex=0;renalConfirmed.Checked=false;confirmed.Checked=false;updating=false;InvalidateMatch();
  }
  void SelfTest() {
   bool passed=false;string error="";try {
    for(int l=0;l<3;l++) {
     language.SelectedIndex=l;SelectEntry("r001");height.Text="170";weight.Text="60";renal.Text="75";reviewer.Text="Synthetic QA";renalConfirmed.Checked=true;confirmed.Checked=true;Calculate();if(!output.Text.Contains("600.00"))throw new Exception("TCbHP calculation");
     Clipboard.SetText(summary);if(Clipboard.GetText()!=summary)throw new Exception("Clipboard");weight.Text="61";if(copy.Enabled||output.Text.Length!=0||confirmed.Checked)throw new Exception("Stale calculation");
     reports["biopsy"].Text="ER 80%; PR 20%; HER2 3+; Ki-67 30%";Parse();phase.SelectedIndex=1;menopause.SelectedIndex=1;surgery.SelectedIndex=1;nodes.SelectedIndex=1;reportReviewed.Checked=true;Match();if(matches.Items.Count==0)throw new Exception("Report match");
     reports["biopsy"].AppendText("; HER2 1+");if(parsed!=null||lastMatch!=null||matches.Items.Count!=0)throw new Exception("Stale report");ClearCase();
     SelectEntry("c003");if(String.IsNullOrWhiteSpace(S(selected,"body"))||!detail.Text.Contains(T(S(selected,"body"))))throw new Exception("Reference card body");
    }
    passed=true;
   }catch(Exception e){error=e.ToString();}
   int i=Array.IndexOf(args,"--test-report");if(i>=0&&i+1<args.Length){string path=Path.GetFullPath(args[i+1]);File.WriteAllText(path,json.Serialize(new {passed=passed,error=error,version=Version,os=Environment.OSVersion.ToString(),bits=IntPtr.Size*8}),Encoding.UTF8);if(passed){using(var bitmap=new Bitmap(Width,Height)){DrawToBitmap(bitmap,new Rectangle(0,0,Width,Height));bitmap.Save(path+".png");}}}
   Environment.ExitCode=passed?0:1;Close();
  }
 }
}
