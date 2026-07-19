import { Suspense } from "react";
import PatientAnalysisPrint from "./patient-analysis-print";

export default function Page() {
  return (
    <Suspense fallback={
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",fontFamily:"system-ui",color:"#64748b"}}>
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:32,marginBottom:12}}>📊</div>
          <div>Preparing report...</div>
        </div>
      </div>
    }>
      <PatientAnalysisPrint />
    </Suspense>
  );
}
