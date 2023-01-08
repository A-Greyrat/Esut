import './App.css';
import WebglCanvas, {
    BoxBlurFilter,
    BrightnessFilter,
    ContrastFilter,
    GaussianBlurFilter,
    GrainyBlurFilter,
    GreyScaleFilter,
    HueFilter,
    RevertFilter,
    SaturationFilter,
    TintFilter,
    WaveFilter,
} from "./Esut";

function App() {
    return (<div>
        <WebglCanvas imgUrl="./5.jpg" filters={[{
            filter: GrainyBlurFilter, params: {
                radius: 60, iterations: 50, downScale: 3
            }
        }]}
                     style={{
                         objectFit: "cover",
                         width: "100%",
                         height: "100%",
                         position: "fixed",
                         filter: "hue-rotate(0deg)"
                     }}
                     isStatic={true}
        />
    </div>);
}

export default App;
