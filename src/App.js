import './App.css';
import {
    BoxBlurFilter,
    BrightnessFilter,
    ContrastFilter, EdgeDetectionFilter,
    GaussianBlurFilter,
    GetBase64FilterPicture,
    GrainyBlurFilter, GranTurismoFilter,
    GreyScaleFilter,
    HueFilter,
    RevertFilter,
    SaturationFilter,
    TintFilter,
    WaveFilter,
} from "./Esut";
import {useEffect, useState} from "react";

function App() {
    const [imgData, setImgData] = useState(null);

    useEffect(() => {
        GetBase64FilterPicture("./1.png", [
            {filter: EdgeDetectionFilter},
        ]).then(r => {
            setImgData(r);
        })
    });

    return (<div>
        <div style={{
            width: "100%", height: "100%",
        }}>
            <img src={imgData} alt="" style={{
                objectFit: "cover", width: "100%", height: "100%", position: "fixed",
            }}/>
        </div>
    </div>);

}

export default App;
