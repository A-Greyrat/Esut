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

function App() {
    let p;
    return (<div>
        <div style={{
            width: "100%", height: "100%",
        }} onClick={
            () => {
                p.tint = [Math.random(), Math.random(), Math.random()];
            }
        }>
            <WebglCanvas imgUrl="./1.png" filters={[
                {filter: TintFilter, params: {
                        tint: [255, 192, 203],
                    },
                    callback: (param) => {
                        p = param;
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
