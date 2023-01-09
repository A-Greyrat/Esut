import './App.css';
import WebglCanvas, {
    BinarizationFilter, BrightnessFilter, ContrastFilter,
    EdgeDetectionFilter,
    GaussianBlurFilter,
    GetBase64FilterPicture,
    GrainyBlurFilter,
    SaturationFilter,
    TintFilter,
    WaveFilter,
} from "./Esut";
import {useEffect, useState} from "react";
let p = [255, 103, 102];

function App() {
    return (<div>
        <div style={{
            width: "100%", height: "100%",
        }} onClick={
            () => {
                p[0] = Math.random();
                p[1] = Math.random();
                p[2] = Math.random();
            }
        }>
            <WebglCanvas imgUrl="./1.png" filters={[
                {filter: TintFilter, params: {
                    tint: p,
                    }
                },
            ]} isStatic={false}
                         style={{
                             width: "100%", height: "100%", objectFit: "cover", position: "fixed",
                         }}
            />
        </div>
    </div>);

}

export default App;
