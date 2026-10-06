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
[assembly: AssemblyVersion("2.0.2.0")]
[assembly: AssemblyFileVersion("2.0.2.0")]
[assembly: AssemblyInformationalVersion("2.0.2")]
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
 sealed class ClassicPages : Panel {
  readonly List<Control> pages=new List<Control>(); int selected;
  public event EventHandler SelectedIndexChanged;
  public int SelectedIndex {get{return selected;}set{selected=value;for(int i=0;i<pages.Count;i++)pages[i].Visible=i==selected;if(selected>=0&&selected<pages.Count)pages[selected].BringToFront();if(SelectedIndexChanged!=null)SelectedIndexChanged(this,EventArgs.Empty);}}
  public void AddPage(Control page){page.Dock=DockStyle.Fill;pages.Add(page);Controls.Add(page);page.Visible=pages.Count-1==selected;if(page.Visible)page.BringToFront();}
 }
 sealed class LegacyWindow : Form {
  const string Version="2.0.2";
  readonly JavaScriptSerializer json=new JavaScriptSerializer {MaxJsonLength=2000000};
  readonly EngineBridge bridge=new EngineBridge(EngineBridge.Resource("engine.js"));
  readonly Dictionary<Control,string> labels=new Dictionary<Control,string>();
  readonly Dictionary<string,ComboBox> fields=new Dictionary<string,ComboBox>();
  readonly Dictionary<string,TextBox> reports=new Dictionary<string,TextBox>();
  readonly Dictionary<string,ComboBox> alternatives=new Dictionary<string,ComboBox>();
  readonly ComboBox language=new ComboBox(), section=new ComboBox(), subtype=new ComboBox(), help=new ComboBox();
  readonly DataGridView drugGrid=new DataGridView();
  readonly FlowLayoutPanel patientInputs=new FlowLayoutPanel {AutoSize=true,Dock=DockStyle.Fill,WrapContents=true};
  readonly Label selectedTitle=new Label {AutoSize=true,Dock=DockStyle.Fill,MaximumSize=new Size(1000,0)};
  readonly ComboBox phase=new ComboBox(), menopause=new ComboBox(), surgery=new ComboBox(), nodes=new ComboBox();
  readonly TextBox query=new TextBox(), height=new TextBox(), weight=new TextBox(), renal=new TextBox(), reviewer=new TextBox(), correction=new TextBox();
  readonly TextBox detail=Area(true), output=Area(true), evidence=Area(true);
  readonly CheckBox confirmed=new CheckBox(), renalConfirmed=new CheckBox(), reportReviewed=new CheckBox(), specialReviewed=new CheckBox();
  readonly ListBox entries=new ListBox {HorizontalScrollbar=true}, matches=new ListBox {HorizontalScrollbar=true};
  readonly FlowLayoutPanel alternativesPanel=new FlowLayoutPanel {Dock=DockStyle.Fill,AutoSize=true,WrapContents=true};
  readonly ClassicPages tabs=new ClassicPages {Dock=DockStyle.Fill};
  readonly FlowLayoutPanel schemeList=new FlowLayoutPanel {Dock=DockStyle.Fill,AutoScroll=true,FlowDirection=FlowDirection.TopDown,WrapContents=false,BackColor=Color.White};
  readonly Dictionary<string,Button> schemeButtons=new Dictionary<string,Button>(), navButtons=new Dictionary<string,Button>();
  readonly Label bsaLabel=new Label {AutoSize=true,Text="—",Font=new Font("Tahoma",15,FontStyle.Bold),ForeColor=Color.FromArgb(13,100,156)};
  readonly TextBox brief=Area(true);
  readonly TabControl sourceTabs=new TabControl {Dock=DockStyle.Fill,Height=160};
  readonly CheckBox clipboardWatch=new CheckBox {AutoSize=true};
  string lastClipboard="";
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
  string T(string text){
   var words=new Dictionary<string,string[]> {
    {"选择方案",new[]{"選擇方案","Select regimen"}}, {"方案详情",new[]{"方案詳情","Regimen details"}},
    {"查看完整核对单",new[]{"查看完整覆核單","View verification sheet"}}, {"帮助",new[]{"幫助","Help"}},
    {"同一治疗阶段",new[]{"同一治療階段","Same phase"}}, {"阶段",new[]{"階段","Phase"}}, {"药物",new[]{"藥物","Drug"}}, {"标准剂量",new[]{"標準劑量","Standard dose"}},
    {"计算量",new[]{"計算量","Calculated amount"}}, {"给药日",new[]{"給藥日","Administration days"}},
    {"病理报告 → 分型核对 → 方案查阅 → 剂量核对",new[]{"病理報告 → 分型核對 → 方案查閱 → 劑量核對","Report → Receptor review → Regimens → Dose verification"}}, {"新患者 / 清空本次",new[]{"新患者 / 清空本次","New patient / Clear case"}}, {"方案与推荐摘要",new[]{"方案與推薦摘要","Regimens and summaries"}}, {"本次计算参数",new[]{"本次計算參數","Calculation parameters"}}, {"体表面积 BSA",new[]{"體表面積 BSA","Body surface area (BSA)"}}, {"离线处理 · 报告不保存",new[]{"離線處理 · 報告不保存","Offline · Reports are not saved"}}, {"治疗阶段",new[]{"治療階段","Treatment setting"}}, {"疗程",new[]{"療程","Duration / cycles"}}, {"出处",new[]{"出處","Source"}}, {"待计算",new[]{"待計算","Pending"}}
   };
   string[] pair;if(words.TryGetValue(text,out pair))return currentLanguage=="en"?pair[1]:currentLanguage=="zh-Hant"?pair[0]:text;
   return (string)Call(new {op="translate",text=text,language=currentLanguage});
  }
  Control Labelled(Control c,string text){labels[c]=text;c.Text=T(text);return c;}
  Label Label(string text){return (Label)Labelled(new Label {AutoSize=true,MaximumSize=new Size(700,0),Margin=new Padding(4,7,4,4)},text);}
  Button Button(string text,Action action){var b=(Button)Labelled(new Button {AutoSize=true,MinimumSize=new Size(88,30),Margin=new Padding(3),FlatStyle=FlatStyle.Flat,BackColor=Color.White,ForeColor=Color.FromArgb(13,100,156)},text);b.FlatAppearance.BorderColor=Color.FromArgb(220,239,250);b.Click+=(s,e)=>Guard(action);return b;}
  void Guard(Action action){try{action();}catch(Exception e){InvalidateDose();MessageBox.Show(this,e.Message,T("请核对"),MessageBoxButtons.OK,MessageBoxIcon.Warning);}}
  FlowLayoutPanel Flow(){return new FlowLayoutPanel {Dock=DockStyle.Fill,AutoSize=true,WrapContents=true,Padding=new Padding(3)};}
  TableLayoutPanel Table(){var table=new TableLayoutPanel {Dock=DockStyle.Fill,ColumnCount=1,AutoScroll=true,Padding=new Padding(6)};table.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,100));return table;}
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
  void InvalidateDose(){InvalidateOutput();if(!updating)confirmed.Checked=false;}
  void InvalidateMatch(){lastMatch=null;matches.Items.Clear();reportReviewed.Checked=false;specialReviewed.Checked=false;InvalidateDose();}
  void ReportsChanged(){if(updating)return;parsed=null;evidence.Clear();InvalidateMatch();}
  public LegacyWindow(string[] arguments) {
   args=arguments; catalogue=D(Call(new {op="catalogue"}));allEntries=A(catalogue["regimens"]).Concat(A(catalogue["referenceCards"])).ToArray();
   Font=new Font("Tahoma",9);ForeColor=Color.FromArgb(23,50,74);BackColor=Color.FromArgb(243,249,253);ClientSize=new Size(1280,820);MinimumSize=new Size(1000,680);AutoScaleMode=AutoScaleMode.Font;StartPosition=FormStartPosition.CenterScreen;
   var root=Table();root.AutoScroll=false;root.Padding=Padding.Empty;Controls.Add(root);
   var top=new TableLayoutPanel {Dock=DockStyle.Fill,AutoSize=true,ColumnCount=2,BackColor=Color.FromArgb(7,59,97),Padding=new Padding(18,12,18,12)};
   top.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,100));top.ColumnStyles.Add(new ColumnStyle(SizeType.AutoSize));
   var brand=Table();brand.AutoScroll=false;brand.BackColor=top.BackColor;brand.Padding=Padding.Empty;
   var title=Label("乳腺癌剂量计算");title.Font=new Font("Tahoma",16,FontStyle.Bold);title.ForeColor=Color.White;title.Margin=Padding.Empty;Row(brand,title,false);
   var subtitle=Label("病理报告 → 分型核对 → 方案查阅 → 剂量核对");subtitle.ForeColor=Color.FromArgb(205,233,249);subtitle.Font=new Font("Tahoma",8);subtitle.Margin=new Padding(0,5,0,0);Row(brand,subtitle,false);top.Controls.Add(brand,0,0);
   var tools=Flow();tools.FlowDirection=FlowDirection.LeftToRight;tools.WrapContents=false;tools.BackColor=top.BackColor;
   language.DropDownStyle=ComboBoxStyle.DropDownList;language.Items.AddRange(new object[]{new Choice("zh-Hans","简体中文"),new Choice("zh-Hant","繁體中文"),new Choice("en","English")});language.Width=112;language.Margin=new Padding(3,7,3,3);language.SelectedIndex=0;tools.Controls.Add(language);
   var clear=Button("新患者 / 清空本次",ClearCase);clear.BackColor=Color.FromArgb(13,100,156);clear.ForeColor=Color.White;tools.Controls.Add(clear);
   help.DropDownStyle=ComboBoxStyle.DropDownList;help.Width=115;help.Margin=new Padding(3,7,3,3);tools.Controls.Add(help);top.Controls.Add(tools,1,0);
   help.SelectedIndexChanged+=(sender,e)=>{if(help.SelectedIndex<=0)return;string key=Key(help);help.SelectedIndex=0;Guard(()=>{if(key=="licence")MessageBox.Show(this,EngineBridge.Resource("LICENSE.txt"),T("非商业学术授权"));else ShowText(T("第三方许可"),EngineBridge.Resource("Jint-LICENSE.txt"));});};
   Options(help,new[]{"","licence","thirdparty"},new[]{"帮助","查看授权","第三方许可"},"");help.Width=115;
   var body=new TableLayoutPanel {Dock=DockStyle.Fill,ColumnCount=2,Margin=Padding.Empty};body.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute,165));body.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,100));
   var nav=Table();nav.AutoScroll=false;nav.Padding=new Padding(8,18,8,10);nav.BackColor=Color.FromArgb(10,79,126);
   var navTitle=Label("治疗阶段");navTitle.ForeColor=Color.FromArgb(191,228,247);Row(nav,navTitle,false);
   var report=NavigationButton("报告识别与病理匹配",()=>tabs.SelectedIndex=1);navButtons["report"]=report;Row(nav,report,false);
   foreach(string key in new[]{"术前新辅助治疗","术后辅助治疗","后续内分泌治疗","保乳术后治疗"}) {string item=key;var button=NavigationButton(item,()=>{for(int i=0;i<section.Items.Count;i++)if(((Choice)section.Items[i]).Key==item){section.SelectedIndex=i;break;}tabs.SelectedIndex=0;});navButtons[item]=button;Row(nav,button,false);}
   var offline=Label("离线处理 · 报告不保存");offline.ForeColor=Color.FromArgb(191,228,247);offline.MaximumSize=new Size(140,0);offline.Font=new Font("Tahoma",8);Row(nav,offline,true);
   body.Controls.Add(nav,0,0);tabs.Margin=new Padding(8);body.Controls.Add(tabs,1,0);Row(root,top,false);root.RowStyles[0]=new RowStyle(SizeType.Absolute,80);Row(root,body,true);BuildCatalogue();BuildReports();tabs.SelectedIndexChanged+=(sender,e)=>SynchronizeNavigation();
   var notice=Label("仅限于学术交流，严禁商业用途\n版权所有 GitHub @jiayi-sketch");notice.Font=new Font("Tahoma",8);notice.ForeColor=Color.FromArgb(96,119,138);notice.MaximumSize=new Size(0,0);notice.Margin=new Padding(12,5,12,5);Row(root,notice,false);
   language.SelectedIndexChanged+=(s,e)=>ChangeLanguage();
   string pref=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"ChemoDose","legacy-language.txt");
   if(!args.Contains("--self-test"))try{if(File.Exists(pref)&&new FileInfo(pref).Length<30){string saved=File.ReadAllText(pref).Trim();for(int i=0;i<language.Items.Count;i++)if(((Choice)language.Items[i]).Key==saved)language.SelectedIndex=i;}}catch(IOException){}catch(UnauthorizedAccessException){}
   ChangeLanguage();section.SelectedIndex=1;Shown+=(s,e)=>{if(args.Contains("--self-test"))BeginInvoke(new Action(SelfTest));};
   Activated+=(s,e)=>{if(clipboardWatch.Checked&&!args.Contains("--self-test"))Guard(()=>ImportClipboard(true));};
  }
  void ShowText(string title,string value) {
   using(var f=new Form {Text=title,Size=new Size(780,560),StartPosition=FormStartPosition.CenterParent,Font=Font}) {
    var text=Area(true);text.Text=value;text.BackColor=Color.White;f.Controls.Add(text);
    var close=Button("返回方案库",()=>f.Close());close.Dock=DockStyle.Bottom;f.Controls.Add(close);f.ShowDialog(this);
   }
  }
  Control InputField(string title,TextBox input,int width) {
   var box=new FlowLayoutPanel {AutoSize=true,FlowDirection=FlowDirection.TopDown,WrapContents=false,Margin=new Padding(3,3,12,3)};
   var label=Label(title);label.Margin=new Padding(0,1,0,3);box.Controls.Add(label);input.Width=width;box.Controls.Add(input);
   input.TextChanged+=(s,e)=>{if(input==height||input==weight||input==renal)renalConfirmed.Checked=false;InvalidateDose();};return box;
  }
  Button NavigationButton(string text,Action action) {
   var button=Button(text,action);button.AutoSize=false;button.Dock=DockStyle.Fill;button.Height=52;button.Margin=Padding.Empty;button.TextAlign=ContentAlignment.MiddleLeft;button.Padding=new Padding(8,0,4,0);button.BackColor=Color.FromArgb(10,79,126);button.ForeColor=Color.White;button.FlatAppearance.BorderSize=0;return button;
  }
  void SynchronizeNavigation() {
   foreach(var pair in navButtons)pair.Value.BackColor=(tabs.SelectedIndex==1?pair.Key=="report":pair.Key==Key(section))?Color.FromArgb(13,100,156):Color.FromArgb(10,79,126);
  }
  void LayoutSchemeButtons() {
   int width=Math.Max(160,schemeList.ClientSize.Width-24);
   foreach(var button in schemeButtons.Values){button.Width=width;button.Height=Math.Max(34,TextRenderer.MeasureText(button.Text,Font,new Size(width-20,0),TextFormatFlags.WordBreak|TextFormatFlags.NoPadding).Height+16);}
  }
  void RefreshSchemeButtons() {
   var old=schemeList.Controls.Cast<Control>().ToArray();schemeList.Controls.Clear();foreach(var c in old)c.Dispose();schemeButtons.Clear();
   foreach(Choice choice in entries.Items) {
    string id=choice.Key;var button=new Button {Text=choice.Label,TextAlign=ContentAlignment.MiddleLeft,FlatStyle=FlatStyle.Flat,Margin=new Padding(0,0,0,1),Padding=new Padding(8,4,8,4),UseVisualStyleBackColor=false};button.FlatAppearance.BorderSize=0;
    button.Click+=(sender,e)=>Guard(()=>{for(int i=0;i<entries.Items.Count;i++)if(((Choice)entries.Items[i]).Key==id){entries.SelectedIndex=i;break;}});schemeButtons[id]=button;schemeList.Controls.Add(button);
   }
   LayoutSchemeButtons();UpdateSchemeSelection();SynchronizeNavigation();
  }
  void UpdateSchemeSelection() {
   foreach(var pair in schemeButtons){bool active=selected!=null&&S(selected,"id")==pair.Key;pair.Value.BackColor=active?Color.FromArgb(13,100,156):Color.White;pair.Value.ForeColor=active?Color.White:ForeColor;}
  }
  void BuildCatalogue() {
   var tab=new Panel {BackColor=Color.FromArgb(243,249,253)};tabs.AddPage(tab);var table=Table();table.AutoScroll=false;table.Padding=Padding.Empty;tab.Controls.Add(table);
   var patient=Table();patient.AutoScroll=false;patient.AutoSize=true;patient.BackColor=Color.White;patient.Padding=new Padding(10,6,10,6);var patientTitle=Label("本次计算参数");patientTitle.Margin=new Padding(4,3,4,3);patientTitle.Font=new Font(Font,FontStyle.Bold);patientTitle.ForeColor=Color.FromArgb(10,79,126);Row(patient,patientTitle,false);
   patientInputs.Controls.Add(InputField("身高（cm）",height,105));patientInputs.Controls.Add(InputField("体重（kg）",weight,105));patientInputs.Controls.Add(InputField("肾功能（mL/min）",renal,130));patientInputs.Controls.Add(InputField("本次核对人",reviewer,160));
   var bsa=Flow();bsa.FlowDirection=FlowDirection.TopDown;bsa.WrapContents=false;bsa.AutoSize=true;bsa.Dock=DockStyle.None;bsa.Controls.Add(Label("体表面积 BSA"));bsa.Controls.Add(bsaLabel);patientInputs.Controls.Add(bsa);Row(patient,patientInputs,false);
   Labelled(renalConfirmed,"请确认肾功能参数的单位和适用性。");renalConfirmed.AutoSize=true;renalConfirmed.Margin=new Padding(6,3,6,3);renalConfirmed.CheckedChanged+=(sender,e)=>InvalidateDose();Row(patient,renalConfirmed,false);
   Labelled(confirmed,"请先核对所选方案、分阶段用药及本次参数，然后勾选确认。");confirmed.AutoSize=true;confirmed.Margin=new Padding(6,3,6,3);confirmed.CheckedChanged+=(sender,e)=>InvalidateOutput();Row(patient,confirmed,false);
   var actions=Flow();actions.Controls.Add(Button("计算",Calculate));Labelled(copy,"复制核对单");copy.AutoSize=true;copy.Enabled=false;copy.Click+=(sender,e)=>Guard(()=>{if(summary!=null){Clipboard.SetText(summary);lastClipboard=summary;}});actions.Controls.Add(copy);actions.Controls.Add(Button("查看完整核对单",()=>{if(summary!=null)ShowText(T("算术核对单（非处方）"),summary);}));Row(patient,actions,false);Row(table,patient,false);
   var columns=new TableLayoutPanel {Dock=DockStyle.Fill,ColumnCount=2,Margin=new Padding(0,8,0,0)};columns.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute,225));columns.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,100));
   var catalog=Table();catalog.AutoScroll=false;catalog.BackColor=Color.White;catalog.Padding=new Padding(8);var catalogTitle=Label("方案与推荐摘要");catalogTitle.Font=new Font(Font,FontStyle.Bold);catalogTitle.ForeColor=Color.FromArgb(10,79,126);Row(catalog,catalogTitle,false);
   Row(catalog,Label("搜索"),false);query.Dock=DockStyle.Fill;Row(catalog,query,false);Row(catalog,Label("受体分型"),false);subtype.Dock=DockStyle.Fill;Row(catalog,subtype,false);Row(catalog,schemeList,true);schemeList.SizeChanged+=(sender,e)=>LayoutSchemeButtons();columns.Controls.Add(catalog,0,0);
   entries.SelectedIndexChanged+=(sender,e)=>{if(!updating&&entries.SelectedItem is Choice)SelectEntry(((Choice)entries.SelectedItem).Key);};section.SelectedIndexChanged+=(sender,e)=>{if(!updating)FilterEntries();};subtype.SelectedIndexChanged+=(sender,e)=>{if(!updating)FilterEntries();};query.TextChanged+=(sender,e)=>{if(!updating)FilterEntries();};
   var right=Table();right.AutoScroll=false;right.BackColor=Color.White;right.Padding=new Padding(10);selectedTitle.Font=new Font(Font,FontStyle.Bold);selectedTitle.ForeColor=Color.FromArgb(10,79,126);selectedTitle.Padding=new Padding(4);Row(right,selectedTitle,false);
   brief.BackColor=Color.FromArgb(243,249,253);brief.BorderStyle=BorderStyle.None;brief.Height=86;brief.Dock=DockStyle.Fill;brief.ScrollBars=ScrollBars.Vertical;Row(right,brief,false);Row(right,alternativesPanel,false);
   drugGrid.Dock=DockStyle.Fill;drugGrid.ReadOnly=true;drugGrid.AllowUserToAddRows=false;drugGrid.AllowUserToDeleteRows=false;drugGrid.RowHeadersVisible=false;drugGrid.BackgroundColor=Color.White;drugGrid.BorderStyle=BorderStyle.FixedSingle;drugGrid.AutoSizeColumnsMode=DataGridViewAutoSizeColumnsMode.Fill;drugGrid.AutoSizeRowsMode=DataGridViewAutoSizeRowsMode.AllCells;drugGrid.SelectionMode=DataGridViewSelectionMode.FullRowSelect;drugGrid.MultiSelect=false;
   drugGrid.DefaultCellStyle.WrapMode=DataGridViewTriState.True;drugGrid.DefaultCellStyle.Padding=new Padding(3,5,3,5);drugGrid.DefaultCellStyle.SelectionBackColor=Color.FromArgb(13,100,156);drugGrid.DefaultCellStyle.SelectionForeColor=Color.White;drugGrid.GridColor=Color.FromArgb(220,239,250);drugGrid.EnableHeadersVisualStyles=false;drugGrid.ColumnHeadersDefaultCellStyle.BackColor=Color.FromArgb(220,239,250);drugGrid.ColumnHeadersDefaultCellStyle.ForeColor=Color.FromArgb(7,59,97);drugGrid.ColumnHeadersHeightSizeMode=DataGridViewColumnHeadersHeightSizeMode.AutoSize;
   string[] headers={"阶段","药物","标准剂量","计算量","给药日","疗程","出处"};float[] widths={65,100,110,140,90,85,90};
   for(int i=0;i<headers.Length;i++){int index=drugGrid.Columns.Add("drug-"+i,T(headers[i]));drugGrid.Columns[index].FillWeight=widths[i];drugGrid.Columns[index].MinimumWidth=48;drugGrid.Columns[index].SortMode=DataGridViewColumnSortMode.NotSortable;drugGrid.Columns[index].Tag=headers[i];}
   var display=new Panel {Dock=DockStyle.Fill,MinimumSize=new Size(0,180)};display.Controls.Add(drugGrid);display.Controls.Add(detail);Row(right,display,true);Row(right,Label("数值为每次给药量；不相加各药或各阶段。区间保留，不自动取中值。"),false);columns.Controls.Add(right,1,0);Row(table,columns,true);
  }
  void RenderDrugs(Dictionary<string,object> result) {
   drugGrid.Rows.Clear();bsaLabel.Text="—";if(result!=null)foreach(var row in A(result["rows"])) {var basis=D(D(D(row)["result"])["basis"]);if(basis.ContainsKey("bsaM2")){bsaLabel.Text=Convert.ToDouble(basis["bsaM2"]).ToString("F3",System.Globalization.CultureInfo.InvariantCulture)+" m²";break;}}bool dose=selected!=null&&selected.ContainsKey("drugs");drugGrid.Visible=dose;detail.Visible=!dose;patientInputs.Parent.Visible=dose;patientInputs.Visible=dose;confirmed.Visible=dose;
   bool auc=dose&&A(selected["drugs"]).Any(o=>S(D(o),"kind")=="auc");if(renal.Parent!=null)renal.Parent.Visible=auc;renalConfirmed.Visible=auc;
   if(!dose)return;
   foreach(var o in A(selected["drugs"])) {
    var d=D(o);string value=T("待计算");
    if(result!=null) {var r=A(result["rows"]).Select(D).First(v=>S(v,"drugId")==S(d,"id"));value=T((string)Call(new {op="quantity",result=r["result"]}));}
    string phaseText=S(d,"phaseLabel");if(phaseText=="同一治疗阶段（疗程分别见各药）")phaseText="同一治疗阶段";int index=drugGrid.Rows.Add(T(phaseText),T(S(d,"name")),T((string)Call(new {op="standard",drug=d})),value,T(S(d,"schedule")),T(S(d,"duration")),Source(d));
    foreach(DataGridViewCell cell in drugGrid.Rows[index].Cells)cell.ToolTipText=T(S(d,"note"));
   }
   drugGrid.ClearSelection();
  }
  void BuildReports() {
   var tab=new Panel();tabs.AddPage(tab);var table=Table();tab.Controls.Add(table);
   Row(table,Label("此 x86 兼容版支持剪贴板文字与药物目录弹窗；截图 OCR 请使用新版 Windows、Mac 或安卓版本。"),false);
   var imports=Flow();imports.Controls.Add(Button("从剪贴板导入",()=>ImportClipboard(false)));Labelled(clipboardWatch,"本次窗口返回前台时自动导入新的病理剪贴板内容");imports.Controls.Add(clipboardWatch);Row(table,imports,false);
   string[] titles={"穿刺/术前病理","术后大病理","免疫组化","HER2 FISH/ISH"};
   for(int i=0;i<sourceKeys.Length;i++){var page=(TabPage)Labelled(new TabPage(),titles[i]);var box=Area(false);reports[sourceKeys[i]]=box;box.TextChanged+=(s,e)=>ReportsChanged();page.Controls.Add(box);sourceTabs.TabPages.Add(page);}Row(table,sourceTabs,false);
   Row(table,Button("识别报告",()=>{Parse();Preview(false);}),false);var values=Flow();foreach(string k in fieldKeys){values.Controls.Add(Label(k));var combo=new ComboBox();fields[k]=combo;values.Controls.Add(combo);combo.SelectedIndexChanged+=(s,e)=>{if(!updating)InvalidateMatch();};}Row(table,values,false);
   evidence.Height=110;Row(table,evidence,false);var contexts=Flow();contexts.Controls.Add(Label("治疗阶段"));contexts.Controls.Add(phase);contexts.Controls.Add(Label("绝经状态"));contexts.Controls.Add(menopause);contexts.Controls.Add(Label("已完成术式"));contexts.Controls.Add(surgery);contexts.Controls.Add(Label("淋巴结状态"));contexts.Controls.Add(nodes);Row(table,contexts,false);
   foreach(var c in new[]{phase,menopause,surgery,nodes})c.SelectedIndexChanged+=(s,e)=>{if(!updating)InvalidateMatch();};
   var reason=Flow();Input(reason,"人工修正依据",correction,420);correction.TextChanged+=(s,e)=>{if(!updating)InvalidateMatch();};Row(table,reason,false);
   Labelled(reportReviewed,"请逐项核对同一患者、同一病灶及同一取材时点的报告。");reportReviewed.AutoSize=true;Row(table,reportReviewed,false);
   Labelled(specialReviewed,"低表达或不常见受体组合需要专项复核确认。");specialReviewed.AutoSize=true;Row(table,specialReviewed,false);
   foreach(var c in new[]{reportReviewed,specialReviewed})c.CheckedChanged+=(s,e)=>{lastMatch=null;matches.Items.Clear();InvalidateDose();};
   Row(table,Button("匹配方案目录",Match),false);Row(table,Label("仅按已核对的阶段和受体分型检索目录，不判断治疗指征、风险或患者适用性。"),false);
   matches.Dock=DockStyle.Fill;Row(table,matches,true);Row(table,Button("打开所选目录条目",()=>{if(lastMatch==null||!(matches.SelectedItem is Choice))throw new Exception(T("请选择"));OpenCatalogueEntry(((Choice)matches.SelectedItem).Key);tabs.SelectedIndex=0;}),false);
  }
  void ChangeLanguage() {
   updating=true;currentLanguage=Key(language);foreach(var pair in labels)pair.Key.Text=T(pair.Value);
   Options(help,new[]{"","licence","thirdparty"},new[]{"帮助","查看授权","第三方许可"},"");help.Width=115;
   Text=T("乳腺癌剂量计算")+" · "+Version;foreach(DataGridViewColumn column in drugGrid.Columns)column.HeaderText=T((string)column.Tag);
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
    if((Key(section)==""||Key(section)==S(r,"section"))&&(Key(subtype)==""||Key(subtype)==S(r,"subtype"))&&(query.Text.Trim()==""||(searchable+" "+T(searchable)).IndexOf(query.Text.Trim(),StringComparison.OrdinalIgnoreCase)>=0)){var choice=new Choice(S(r,"id"),T(S(r,"name")));entries.Items.Add(choice);}}
   updating=false;selected=null;detail.Clear();brief.Clear();selectedTitle.Text="";alternatives.Clear();alternativesPanel.Controls.Clear();InvalidateDose();
   for(int i=0;i<entries.Items.Count;i++)if(((Choice)entries.Items[i]).Key==previous){entries.SelectedIndex=i;break;}
   if(entries.SelectedIndex<0&&entries.Items.Count>0)entries.SelectedIndex=0;
   RefreshSchemeButtons();
  }
  string Source(Dictionary<string,object> r){return T((string)Call(new {op="source",entry=r}));}
  void OpenCatalogueEntry(string id) {
   var target=allEntries.Select(D).First(r=>S(r,"id")==id);updating=true;query.Clear();subtype.SelectedIndex=0;
   for(int i=0;i<section.Items.Count;i++)if(((Choice)section.Items[i]).Key==S(target,"section")){section.SelectedIndex=i;break;}
   updating=false;FilterEntries();SelectEntry(id);
  }
  void SelectEntry(string id) {
   selected=allEntries.Select(D).First(r=>S(r,"id")==id);InvalidateDose();alternatives.Clear();alternativesPanel.Controls.Clear();
   var text=new List<string>{T(S(selected,"name")),T(S(selected,"section"))+" / "+T(S(selected,"subtype")),T(S(selected,"level")),T(S(selected,"eligibility")),T(S(selected,"notes")),T(S(selected,"body")),Source(selected)};
   if(selected.ContainsKey("drugs"))foreach(var o in A(selected["drugs"])) {
    var d=D(o);text.Add("["+T(S(d,"phaseLabel"))+"] "+T(S(d,"name"))+"\r\n"+T((string)Call(new {op="standard",drug=d}))+"\r\n"+T(S(d,"schedule"))+"; "+T(S(d,"duration"))+"\r\n"+T(S(d,"note"))+"\r\n"+Source(d));
    if(S(d,"kind")=="fixed_alt") {alternativesPanel.Controls.Add(Label(T(S(d,"name"))));var c=new ComboBox();alternatives[S(d,"id")]=c;var schedules=A(d["schedules"]).Select(Convert.ToString).ToArray();Options(c,new[]{"","0","1"},new[]{"请选择",schedules[0],schedules[1]},"");c.SelectedIndexChanged+=(s,e)=>InvalidateDose();alternativesPanel.Controls.Add(c);}
   }
   detail.Text=String.Join("\r\n\r\n",text.ToArray());selectedTitle.Text=T(S(selected,"name"));brief.Text=String.Join("\r\n",new[]{T(S(selected,"subtype"))+" · "+T(S(selected,"level")),T(S(selected,"eligibility")),T(S(selected,"notes")),Source(selected)});
   bool wasUpdating=updating;updating=true;for(int i=0;i<entries.Items.Count;i++)if(((Choice)entries.Items[i]).Key==id){entries.SelectedIndex=i;break;}updating=wasUpdating;UpdateSchemeSelection();SynchronizeNavigation();RenderDrugs(null);
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
   summary=String.Join("\r\n\r\n",lines.ToArray());output.Text=summary;copy.Enabled=true;RenderDrugs(result);
  }
  void InvalidateOutput(){summary=null;output.Clear();copy.Enabled=false;RenderDrugs(null);}
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
   if(!args.Contains("--self-test"))Preview(true);
  }
  void ImportClipboard(bool automatic) {
   if(!Clipboard.ContainsText())return;string text=Clipboard.GetText();
   if(automatic&&(text==lastClipboard||!System.Text.RegularExpressions.Regex.IsMatch(text,@"\b(?:ER|PR|HER[ -]?2|Ki[ -]?67)\b|乳腺|病理|免疫组化|免疫組化",System.Text.RegularExpressions.RegexOptions.IgnoreCase)))return;
   if(text.Length>40000)throw new Exception(T("相关报告合计最多40000字，请缩短后重试。"));lastClipboard=text;
   reports[sourceKeys[Math.Max(0,sourceTabs.SelectedIndex)]].Text=text;tabs.SelectedIndex=1;Parse();Preview(false);
  }
  void Preview(bool reviewed) {
   if(parsed==null)return;
   var classification=D(Call(new {op="classify",values=fields.ToDictionary(p=>p.Key,p=>(object)Key(p.Value))}));
   var lines=new List<string>{T("目录候选，尚需核对治疗指征；以下不是处方。")};
   foreach(var issue in A(classification["issues"]).Concat(A(classification["notes"])))lines.Add(T(Convert.ToString(issue)));
   string subtypeValue=S(classification,"subtype");
   if(subtypeValue!="") {
    lines.Add(T(subtypeValue));foreach(var check in A(Call(new {op="checks",subtype=subtypeValue,phase=Key(phase)})))lines.Add(T(Convert.ToString(check)));
    IEnumerable<object> candidates;
    if(reviewed&&lastMatch!=null)candidates=A(lastMatch["matches"]).Concat(A(lastMatch["references"]));
    else if(Key(phase)=="post-neo")candidates=allEntries.Where(o=>(subtypeValue=="HER2阳性"?new[]{"c003"}:subtypeValue=="三阴性"?new[]{"c004"}:new[]{"c018","c010","c012"}).Contains(S(D(o),"id")));
    else candidates=allEntries.Where(o=>S(D(o),"subtype")==subtypeValue&&S(D(o),"entryType")=="regimen"&&(Key(phase)==""||S(D(o),"section")== (Key(phase)=="neo"?"术前新辅助治疗":"术后辅助治疗")));
    foreach(var o in candidates){var entry=D(o);lines.Add(T(S(entry,"section")+" / "+S(entry,"name"))+"\r\n"+Source(entry));if(entry.ContainsKey("drugs"))foreach(var row in A(entry["drugs"])){var drug=D(row);lines.Add(T(S(drug,"phaseLabel"))+" · "+T(S(drug,"name"))+" · "+T((string)Call(new {op="standard",drug=drug}))+" · "+T(S(drug,"schedule"))+" · "+T(S(drug,"duration"))+" · "+Source(drug));}else lines.Add(T(S(entry,"body")));}
   }
   using(var dialog=new Form {Text=T("病理识别与药物目录"),Size=new Size(800,600),StartPosition=FormStartPosition.CenterParent}) {
    var text=Area(true);text.Text=String.Join("\r\n\r\n",lines.ToArray());dialog.Controls.Add(text);
    var close=Button("核对报告与治疗阶段",()=>dialog.Close());close.Dock=DockStyle.Bottom;dialog.Controls.Add(close);dialog.ShowDialog(this);
   }
  }
  void ClearCase() {
   updating=true;foreach(var box in reports.Values)box.Clear();foreach(var box in new[]{height,weight,renal,reviewer,correction})box.Clear();parsed=null;evidence.Clear();foreach(var c in fields.Values)c.SelectedIndex=0;foreach(var c in new[]{phase,menopause,surgery,nodes})c.SelectedIndex=0;foreach(var c in alternatives.Values)c.SelectedIndex=0;renalConfirmed.Checked=false;confirmed.Checked=false;updating=false;InvalidateMatch();
  }
  void SelfTest() {
   bool passed=false;string error="";try {
    for(int l=0;l<3;l++) {
     language.SelectedIndex=l;OpenCatalogueEntry("r001");height.Text="170";weight.Text="60";renal.Text="75";reviewer.Text="Synthetic QA";renalConfirmed.Checked=true;confirmed.Checked=true;Calculate();if(!output.Text.Contains("600.00"))throw new Exception("TCbHP calculation");
     Clipboard.SetText(summary);if(Clipboard.GetText()!=summary)throw new Exception("Clipboard");weight.Text="61";if(copy.Enabled||output.Text.Length!=0||confirmed.Checked)throw new Exception("Stale calculation");
     reports["biopsy"].Text="ER 80%; PR 20%; HER2 3+; Ki-67 30%";Parse();phase.SelectedIndex=1;menopause.SelectedIndex=1;surgery.SelectedIndex=1;nodes.SelectedIndex=1;reportReviewed.Checked=true;Match();if(matches.Items.Count==0)throw new Exception("Report match");
     reports["biopsy"].AppendText("; HER2 1+");if(parsed!=null||lastMatch!=null||matches.Items.Count!=0)throw new Exception("Stale report");ClearCase();
     OpenCatalogueEntry("c003");if(String.IsNullOrWhiteSpace(S(selected,"body"))||!detail.Text.Contains(T(S(selected,"body"))))throw new Exception("Reference card body");
    }
    OpenCatalogueEntry("r056");if(!(entries.SelectedItem is Choice)||((Choice)entries.SelectedItem).Key!="r056"||S(selected,"id")!="r056")throw new Exception("Matched entry picker across settings");
    schemeButtons[((Choice)entries.Items[0]).Key].PerformClick();if(S(selected,"id")!=((Choice)entries.SelectedItem).Key)throw new Exception("Picker after opening a matched entry");
    OpenCatalogueEntry("r001");
    int reportIndex=Array.IndexOf(args,"--test-report");
    for(int l=0;l<3;l++) {
     language.SelectedIndex=l;OpenCatalogueEntry("r001");height.Text="170";weight.Text="60";renal.Text="75";reviewer.Text="Synthetic QA";renalConfirmed.Checked=true;confirmed.Checked=true;Calculate();
     if(drugGrid.Rows.Count!=4||!Convert.ToString(drugGrid.Rows[1].Cells[3].Value).Contains("600.00"))throw new Exception("Classic grid calculated amount");
     if(!(entries.SelectedItem is Choice)||((Choice)entries.SelectedItem).Key!="r001"||schemeButtons["r001"].BackColor!=Color.FromArgb(13,100,156))throw new Exception("Classic visible list selection");
     if(reportIndex>=0&&reportIndex+1<args.Length)SavePreview(args[reportIndex+1]+"."+Key(language)+".png");
     weight.Text="61";if(drugGrid.Rows.Cast<DataGridViewRow>().Any(r=>Convert.ToString(r.Cells[3].Value).Contains("600.00")))throw new Exception("Stale grid amount");
    }
    ClientSize=new Size(1024,700);OpenCatalogueEntry("r018");PerformLayout();
    if(drugGrid.Rows.Count!=6||drugGrid.Width<500||drugGrid.Height<180||schemeList.Width<180||patientInputs.PointToScreen(Point.Empty).Y>=schemeList.PointToScreen(Point.Empty).Y)throw new Exception("Classic layout on small display");
    if(drugGrid.PointToScreen(new Point(drugGrid.Width,0)).X>tabs.PointToScreen(new Point(tabs.ClientSize.Width,0)).X||((TableLayoutPanel)Controls[0]).GetControlFromPosition(0,0).Height>90||drugGrid.Columns.Cast<DataGridViewColumn>().Sum(c=>c.Width)>drugGrid.ClientSize.Width)throw new Exception("Classic header or result columns clipped");
    if(reportIndex>=0&&reportIndex+1<args.Length)SavePreview(args[reportIndex+1]+".small.png");
    passed=true;
   }catch(Exception e){error=e.ToString();}
   int i=Array.IndexOf(args,"--test-report");if(i>=0&&i+1<args.Length){string path=Path.GetFullPath(args[i+1]);File.WriteAllText(path,json.Serialize(new {passed=passed,error=error,version=Version,os=Environment.OSVersion.ToString(),bits=IntPtr.Size*8}),Encoding.UTF8);if(passed){using(var bitmap=new Bitmap(Width,Height)){DrawToBitmap(bitmap,new Rectangle(0,0,Width,Height));bitmap.Save(path+".png");}}}
   Environment.ExitCode=passed?0:1;Close();
  }
  void SavePreview(string path) {
   PerformLayout();using(var bitmap=new Bitmap(Width,Height)){DrawToBitmap(bitmap,new Rectangle(0,0,Width,Height));bitmap.Save(path);}
  }
 }
}
