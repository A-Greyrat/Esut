import './App.css';
import WebglCanvas, {
    BoxBlurFilter, BrightnessFilter, ContrastFilter, RevertFilter, SaturationFilter, TintFilter, WaveFilter,
} from "./Esut";

function App() {
    return (<div>
            <WebglCanvas imgUrl="./5.jpg"
                         filters={[{filter: BoxBlurFilter}]}
                         style={{objectFit: "cover", width: "100%", height: "100%", position: "fixed",}}
                         isStatic={true}
            />
        </div>);
}

export default App;
