import './App.css';
import WebglCanvas, {
    BoxBlurFilter,
    BrightnessFilter,
    ContrastFilter,
    GaussianBlurFilter, GetBase64FilterPicture,
    GrainyBlurFilter,
    GreyScaleFilter,
    HueFilter,
    RevertFilter,
    SaturationFilter,
    TintFilter,
    WaveFilter,
} from "./Esut";
import React, {useState} from "react";

let imgData = null;

class App extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            imgData: null,
        };
    }

    componentDidMount() {
        GetBase64FilterPicture("./5.jpg", [{filter: GrainyBlurFilter}]).then(r => {
            this.setState({imgData: r});
        });
    }

    render(){
        return(<div>
            <div style={{
                width: "100%", height: "100%",
            }}>
                {/*<WebglCanvas imgUrl="./5.jpg"*/}
                {/*             filters={[*/}
                {/*                 {filter: HueFilter, params: {hue: 20}},*/}
                {/*                 {filter: GaussianBlurFilter, params: {radius: 1.6, iterations: 80, downScale: 2}},*/}
                {/*                 {filter: GrainyBlurFilter},*/}
                {/*                 {filter: SaturationFilter, params: { saturation: 1.2 }}*/}
                {/*             ]}*/}
                {/*             style={{objectFit: "cover", width: "100%", height: "100%", position: "fixed",}}*/}
                {/*             isStatic={true}*/}
                {/*/>*/}
                <img src={this.state.imgData}  alt="" style={
                    {
                        objectFit: "cover",
                        width: "100%",
                        height: "100%",
                        position: "fixed",
                    }
                }/>
            </div>
        </div>);
    }

}

export default App;
