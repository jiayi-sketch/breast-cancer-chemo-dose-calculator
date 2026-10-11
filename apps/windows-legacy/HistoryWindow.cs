// SPDX-License-Identifier: LicenseRef-ChemoDose-Academic-NonCommercial
using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Windows.Forms;
using ChemoDose.Storage;
namespace ChemoDose.Legacy {
 sealed partial class LegacyWindow {
  HistoryStore historyStore;
  readonly CheckBox historyAutoSave=new CheckBox {AutoSize=true,Checked=true};
  bool historyPreferenceLoading;
  void InitializeHistory() {
   historyStore=new HistoryStore(args.Contains("--self-test")?Path.Combine(Path.GetTempPath(),"ChemoDose-History-Test",Guid.NewGuid().ToString("N")):Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"ChemoDose"));
   try {LoadHistoryPreference();}catch(Exception){historyAutoSave.Checked=false;}
   historyAutoSave.CheckedChanged+=(s,e)=>{if(historyPreferenceLoading)return;try{HistoryChange(new {op="preference",autoSave=historyAutoSave.Checked});}catch(Exception){historyPreferenceLoading=true;historyAutoSave.Checked=false;historyPreferenceLoading=false;MessageBox.Show(this,T("本机历史记录读写失败，已有记录未修改。"));}};
  }
  Dictionary<string,object> ReadHistory(){return D(Call(new {op="history-read",content=historyStore.Read().Content}));}
  void LoadHistoryPreference(){var state=ReadHistory();historyPreferenceLoading=true;historyAutoSave.Checked=(bool)state["autoSave"];historyPreferenceLoading=false;}
  void HistoryChange(object operation) {
   for(int attempt=0;attempt<3;attempt++) {
    var snapshot=historyStore.Read();var state=Call(new {op="history-read",content=snapshot.Content});var next=Call(new {op="history-change",state=state,operation=operation});
    if(historyStore.Write(json.Serialize(next),snapshot.Revision))return;
   }throw new IOException("History conflict.");
  }
  void SaveHistory(Dictionary<string,object> result,string text) {
   try {
    var state=ReadHistory();if(!(bool)state["autoSave"])return;
    var record=new {id="record-"+Guid.NewGuid().ToString("N"),savedAt=DateTime.UtcNow.ToString("o"),kind="regimen",entryId=S(selected,"id"),title=S(selected,"name"),patient=result["patient"],inputs=result["inputs"],summary=text+"\r\n\r\n"+T("算术核对单（非处方）"),language=currentLanguage,appVersion=Version,catalogueVersion=S(catalogue,"version"),
     results=A(result["rows"]).Select(o=>{var row=D(o);var r=D(row["result"]);return new {drugId=S(row,"drugId"),engineVersion=S(r,"engineVersion"),quantities=r["quantities"]};}).ToArray()};
    HistoryChange(new {op="add",record=Call(new {op="history-record",record=record})});
   }catch(Exception){MessageBox.Show(this,T("剂量计算已完成，但本机历史保存失败，已有记录未修改。"),T("历史记录"));}
  }
  void RestoreHistory(Dictionary<string,object> record) {
   if(S(record,"kind")!="regimen")throw new Exception(T("此记录属于自定义单药页面，请在现代界面查阅。"));
   string id=S(record,"entryId");if(!allEntries.Any(o=>S(D(o),"id")==id))throw new Exception(T("原方案已不在当前目录，请只查阅历史记录。"));
   ClearCase();OpenCatalogueEntry(id);var patient=D(record["patient"]);var inputs=D(record["inputs"]);
   hospitalNumber.Text=S(patient,"hospitalNumber");patientAge.Text=S(patient,"ageYears");height.Text=S(inputs,"heightCm");weight.Text=S(inputs,"weightKg");
   if(inputs.ContainsKey("renalFunction"))renal.Text=S(D(inputs["renalFunction"]),"value");
   if(inputs.ContainsKey("alternatives"))foreach(var pair in D(inputs["alternatives"]))if(alternatives.ContainsKey(pair.Key)){var combo=alternatives[pair.Key];for(int i=0;i<combo.Items.Count;i++)if(((Choice)combo.Items[i]).Key==Convert.ToString(pair.Value))combo.SelectedIndex=i;}
   renalConfirmed.Checked=false;confirmed.Checked=false;InvalidateOutput();tabs.SelectedIndex=0;
  }
  void ShowHistory() {
   using(var form=new Form {Text=T("本机历史记录"),Size=new Size(960,620),MinimumSize=new Size(650,450),StartPosition=FormStartPosition.CenterParent,Font=Font}) {
    var layout=Table();form.Controls.Add(layout);Row(layout,Label("仅在本机保存年龄、住院号、计算参数、方案和剂量结果；不保存病理原文或截图。不上传，不在打开软件时自动载入患者。"),false);
    var search=new TextBox {Dock=DockStyle.Fill};Row(layout,search,false);
    var columns=new TableLayoutPanel {Dock=DockStyle.Fill,ColumnCount=2};columns.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,45));columns.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,55));
    var list=new ListBox {Dock=DockStyle.Fill,HorizontalScrollbar=true};var preview=Area(true);columns.Controls.Add(list,0,0);columns.Controls.Add(preview,1,0);Row(layout,columns,true);
    object[] records=new object[0];var items=new Dictionary<string,Dictionary<string,object>>();
    Action refresh=()=>{var state=ReadHistory();records=A(state["records"]);items.Clear();list.Items.Clear();preview.Clear();foreach(var o in A(Call(new {op="history-search",records=records,query=search.Text}))){var r=D(o);items[S(r,"id")]=r;var p=D(r["patient"]);list.Items.Add(new Choice(S(r,"id"),S(p,"hospitalNumber")+" · "+S(p,"ageYears")+" · "+T(S(r,"title"))+" · "+S(r,"savedAt")));}};
    list.SelectedIndexChanged+=(s,e)=>{var c=list.SelectedItem as Choice;preview.Text=c==null?"":S(items[c.Key],"summary");};
    search.TextChanged+=(s,e)=>Guard(refresh);
    var actions=Flow();actions.Controls.Add(Button("刷新",refresh));actions.Controls.Add(Button("载入参数重新核对",()=>{var c=list.SelectedItem as Choice;if(c==null)return;RestoreHistory(items[c.Key]);form.Close();}));
    actions.Controls.Add(Button("删除所选记录",()=>{var c=list.SelectedItem as Choice;if(c==null)return;if(MessageBox.Show(form,T("删除后无法恢复，请确认。"),T("删除所选记录"),MessageBoxButtons.YesNo)!=DialogResult.Yes)return;HistoryChange(new {op="delete",id=c.Key});refresh();}));
    actions.Controls.Add(Button("清空历史记录",()=>{if(MessageBox.Show(form,T("删除后无法恢复，请确认。"),T("清空历史记录"),MessageBoxButtons.YesNo)!=DialogResult.Yes)return;HistoryChange(new {op="clear"});refresh();}));actions.Controls.Add(Button("关闭",()=>form.Close()));Row(layout,actions,false);
    refresh();form.ShowDialog(this);
   }
  }
 }
}
