/*
 * Author: Adarion
 * Description: A simple image processing library based on WebGL.
 * Version: 0.1
 * License: MIT
 */

import React from "react";

export default class WebglCanvas extends React.Component {
    initGL() {
        // 获取webgl2上下文并初始化
        this.gl = this.glCanvas.getContext("webgl2");
        this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.gl.disable(this.gl.DEPTH_TEST);
        this.gl.disable(this.gl.CULL_FACE);
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, 1);

        this.gl.viewport(0, 0, this.glCanvas.width, this.glCanvas.height);

        // 帧缓冲
        const [fa, ta] = CreateFrameBuffer(this.gl, this.glCanvas.width, this.glCanvas.height);
        const [fb, tb] = CreateFrameBuffer(this.gl, this.glCanvas.width, this.glCanvas.height);
        this.frameBufferA = fa;
        this.frameBufferB = fb;
        this.frameBufferTextureA = ta;
        this.frameBufferTextureB = tb;

        // 创建纹理
        this.glTexture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.glTexture);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.img);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);

        // 创建顶点缓冲
        const positionBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([-1.0, -1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0,]), this.gl.STATIC_DRAW);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);

        // 创建纹理缓冲
        const textureBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, textureBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([0.0, 0.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0]), this.gl.STATIC_DRAW);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);

        this.biltShader = CreateShader(this.gl, defaultVertexShader, defaultFragmentShader);
        this.gl.useProgram(this.biltShader);

        const positionLocation = this.gl.getAttribLocation(this.biltShader, "a_position");
        const textureLocation = this.gl.getAttribLocation(this.biltShader, "a_texCoord");

        this.gl.enableVertexAttribArray(positionLocation);
        this.gl.enableVertexAttribArray(textureLocation);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
        this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, textureBuffer);
        this.gl.vertexAttribPointer(textureLocation, 2, this.gl.FLOAT, false, 0, 0);
    }

    updateGL() {
        BlitTexture(this.gl, this.glTexture, this.frameBufferA, this.biltShader, this.glCanvas.width, this.glCanvas.height);

        let srcFrameBuffer = this.frameBufferA;
        let dstFrameBuffer = this.frameBufferB;
        let srcTexture = this.frameBufferTextureA
        let dstTexture = this.frameBufferTextureB;

        for (let i = 0; i < this.filters.length; i++) {
            this.filters[i](srcTexture, dstFrameBuffer);
            // PingPong FrameBuffer
            const tempFbo = srcFrameBuffer;
            srcFrameBuffer = dstFrameBuffer;
            dstFrameBuffer = tempFbo;

            const tempTex = srcTexture;
            srcTexture = dstTexture;
            dstTexture = tempTex;
        }

        // Draw to canvas
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        this.gl.viewport(0, 0, this.glCanvas.width, this.glCanvas.height);
        this.gl.useProgram(this.biltShader);
        this.gl.bindTexture(this.gl.TEXTURE_2D, srcTexture);
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    }

    constructor(props) {
        super(props);
        this.canvasRef = React.createRef();

        this.state = {
            imgUrl: this.props.imgUrl, filters: this.props.filters || [], isStatic: this.props.isStatic || false
        }
    }

    componentDidMount() {
        this.glCanvas = this.canvasRef.current;
        this.glCanvas.willReadFrequently = true;
        this.img = new Image();
        this.img.src = this.props.imgUrl;
        this.img.onload = () => {
            this.glCanvas.width = this.img.width;
            this.glCanvas.height = this.img.height;
            this.gl = this.glCanvas.getContext("webgl2");

            this.initGL();

            this.filters = this.state.filters.map((obj) => {
                return obj.filter(this.gl, obj.params, obj.callback);
            });

            this.updateGL();

            if (!this.state.isStatic) this.update();
        }
    }

    update() {
        this.updateGL();
        requestAnimationFrame(this.update.bind(this));
    }

    async GetImgData() {
        this.glCanvas = document.createElement('canvas');
        this.glCanvas.willReadFrequently = true;
        this.img = new Image();
        this.img.src = this.props.imgUrl;
        await this.img.decode().then(
            () => {
                this.glCanvas.width = this.img.width;
                this.glCanvas.height = this.img.height;
                this.gl = this.glCanvas.getContext("webgl2");

                this.initGL();

                this.filters = this.state.filters.map((obj) => {
                    return obj.filter(this.gl, obj.params);
                });

                this.updateGL();
            }
        );

        return this.glCanvas.toDataURL("image/");
    }

    render() {
        return <canvas ref={this.canvasRef} style={this.props.style}/>
    }
}

/* Utility */

const defaultVertexShader = `#version 300 es
    precision mediump float;
    // Notice: 如果需要自定义Vertex, 请确保position和uv输入正确
    in vec2 a_position;
    in vec2 a_texCoord;
    out vec2 v_texCoord;
    
    void main() {
        v_texCoord = vec2(a_texCoord.x, a_texCoord.y);
        gl_Position = vec4(a_position.xy, 0.0, 1.0);
    }
`;
const defaultFragmentShader = `#version 300 es
    precision mediump float;
    uniform sampler2D u_image;
    in vec2 v_texCoord;
    out vec4 fragColor;
    
    void main() {
        fragColor = texture(u_image, v_texCoord);
    }
`;

function Clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function Blit(gl, src, dst, srcWidth, srcHeight, dstWidth, dstHeight) {
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, src);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, dst);
    gl.blitFramebuffer(0, 0, srcWidth, srcHeight, 0, 0, dstWidth, dstHeight, gl.COLOR_BUFFER_BIT, gl.LINEAR);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function BlitTexture(gl, srcTex, dstFbo, shader, width, height, setUniforms = () => {}) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, dstFbo);
    gl.viewport(0, 0, width, height);
    gl.useProgram(shader);
    setUniforms();
    gl.bindTexture(gl.TEXTURE_2D, srcTex);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function CreateShader(gl, vert, frag, notBindTexture = false) {
    const vertexShaderObj = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShaderObj, vert);
    gl.compileShader(vertexShaderObj);
    if (!gl.getShaderParameter(vertexShaderObj, gl.COMPILE_STATUS)) {
        console.log(gl.getShaderInfoLog(vertexShaderObj));
    }
    const fragShaderObj = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragShaderObj, frag);
    gl.compileShader(fragShaderObj);
    if (!gl.getShaderParameter(fragShaderObj, gl.COMPILE_STATUS)) {
        console.log(gl.getShaderInfoLog(fragShaderObj));
    }

    const shader = gl.createProgram();
    gl.attachShader(shader, vertexShaderObj);
    gl.attachShader(shader, fragShaderObj);
    gl.linkProgram(shader);
    if (!gl.getProgramParameter(shader, gl.LINK_STATUS)) {
        console.log(gl.getProgramInfoLog(shader));
    }

    if (!notBindTexture) {
        gl.useProgram(shader);
        gl.uniform1i(gl.getUniformLocation(shader, "u_image"), 0);
    }
    return shader;
}

function CreateFrameBuffer(gl, width, height) {
    const frameBuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
        console.log("Framebuffer is not complete.");
    }

    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    return [frameBuffer, texture];
}

export async function GetBase64FilterPicture(imgUrl, filters) {
    const canvas = new WebglCanvas({
        imgUrl: imgUrl, filters: filters, isStatic: true
    });
    return await canvas.GetImgData();
}


/* Filters */

export function WaveFilter(gl, param, callback) {
    const vert = defaultVertexShader;
    const frag = `#version 300 es
        precision mediump float;
        in vec2 v_texCoord;
        out vec4 fragColor;
        
        uniform sampler2D u_image;
        uniform vec2 u_textureSize;
        uniform float u_time;
        uniform float u_frequency;
        uniform float u_amplitude;
        uniform float u_speed;
        
        vec2 wave(vec2 p) {
            float tx = p.x + u_time * u_speed * 0.0002;
            float ty = p.y + u_time * u_speed * 0.0002;
            float x = sin((25.0 * p.y + 30.0 * p.x + 6.28 * tx) * u_frequency) * u_amplitude * 0.01;
            float y = sin((25.0 * p.y + 30.0 * p.x + 6.28 * ty) * u_frequency) * u_amplitude * 0.01;
            vec2 offset = vec2(x, y);
    
            return vec2(p.x, p.y) + offset;
        }
    
        void main() {
            vec4 color = texture(u_image, wave(v_texCoord));
            fragColor = color;
        }
    `;

    const program = CreateShader(gl, vert, frag);

    let time = 0;
    setInterval(() => time += 1000 / 60, 1000 / 60);

    if (param === undefined || Object.values(param).length === 0) {
        param = {
            amplitude: 0.2, frequency: 2, speed: 1,
        }
    }

    if (callback !== undefined && typeof callback === "function") {
        callback(param);
    }

    return (srcTexture, dstFbo) => BlitTexture(gl, srcTexture, dstFbo, program, gl.drawingBufferWidth, gl.drawingBufferHeight, () => {
        gl.uniform1f(gl.getUniformLocation(program, "u_time"), time);
        gl.uniform2f(gl.getUniformLocation(program, "u_textureSize"), gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.uniform1f(gl.getUniformLocation(program, "u_amplitude"), param.amplitude);
        gl.uniform1f(gl.getUniformLocation(program, "u_frequency"), param.frequency);
        gl.uniform1f(gl.getUniformLocation(program, "u_speed"), param.speed);
    });
}

export function RevertFilter(gl, param, callback) {
    const vert = defaultVertexShader;
    const frag = `#version 300 es
        precision mediump float;
        in vec2 v_texCoord;
        out vec4 fragColor;
        
        uniform sampler2D u_image;
        
        void main() {
            vec4 color = texture(u_image, v_texCoord);
            fragColor = vec4(1.0 - color.rgb, color.a);   
        }
          
    `;

    const program = CreateShader(gl, vert, frag);

    if (callback !== undefined && typeof callback === "function") {
        callback(param);
    }

    return (srcTexture, dstFbo) => BlitTexture(gl, srcTexture, dstFbo, program, gl.drawingBufferWidth, gl.drawingBufferHeight);
}

export function TintFilter(gl, param, callback) {
    const vert = defaultVertexShader;
    const frag = `#version 300 es
        precision mediump float;
        in vec2 v_texCoord;
        out vec4 fragColor;
        
        uniform sampler2D u_image;
        uniform vec3 u_tint;
        
        void main() {
            vec4 color = texture(u_image, v_texCoord);
            fragColor = vec4(color.rgb * u_tint, color.a);   
        }
          
    `;

    const program = CreateShader(gl, vert, frag);

    if (param === undefined || Object.values(param).length === 0) {
        param = {
            tint: [255, 255, 255]
        }
    }

    param.tint = param.tint.map(x => Clamp(x, 0, 255) / 255);

    if (callback !== undefined && typeof callback === "function") {
        callback(param);
    }

    return (srcTexture, dstFbo) => BlitTexture(gl, srcTexture, dstFbo, program, gl.drawingBufferWidth, gl.drawingBufferHeight, () => {
        gl.uniform3fv(gl.getUniformLocation(program, "u_tint"), param.tint);
    });
}

export function BrightnessFilter(gl, param, callback) {
    const vert = defaultVertexShader;
    const frag = `#version 300 es
        precision mediump float;
        in vec2 v_texCoord;
        out vec4 fragColor;
        
        uniform sampler2D u_image;
        uniform float u_brightness;
        
        void main() {
            vec4 color = texture(u_image, v_texCoord);
            fragColor = vec4(color.rgb * u_brightness, color.a);   
        }
          
    `;

    const program = CreateShader(gl, vert, frag);

    if (param === undefined || Object.values(param).length === 0) {
        param = {
            brightness: 1
        }
    }

    if (callback !== undefined && typeof callback === "function") {
        callback(param);
    }

    return (srcTexture, dstFbo) => BlitTexture(gl, srcTexture, dstFbo, program, gl.drawingBufferWidth, gl.drawingBufferHeight, () => {
        gl.uniform1f(gl.getUniformLocation(program, "u_brightness"), param.brightness);
    });
}

export function ContrastFilter(gl, param, callback) {
    const vert = defaultVertexShader;
    const frag = `#version 300 es
        precision mediump float;
        in vec2 v_texCoord;
        out vec4 fragColor;
        
        uniform sampler2D u_image;
        uniform float u_contrast;
        
        void main() {
            vec4 color = texture(u_image, v_texCoord);
            fragColor = vec4((color.rgb - 0.5) * u_contrast + 0.5, color.a);   
        }
          
    `;

    const program = CreateShader(gl, vert, frag);

    if (param === undefined || Object.values(param).length === 0) {
        param = {
            contrast: 1
        }
    }

    if (callback !== undefined && typeof callback === "function") {
        callback(param);
    }

    return (srcTexture, dstFbo) => BlitTexture(gl, srcTexture, dstFbo, program, gl.drawingBufferWidth, gl.drawingBufferHeight, () => {
        gl.uniform1f(gl.getUniformLocation(program, "u_contrast"), param.contrast);
    });
}

export function SaturationFilter(gl, param, callback) {
    const vert = defaultVertexShader;
    const frag = `#version 300 es
        precision mediump float;
        in vec2 v_texCoord;
        out vec4 fragColor;
          
        uniform sampler2D u_image;
        uniform float u_saturation;
        
        void main() {
            vec4 color = texture(u_image, v_texCoord);
            float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
            fragColor = vec4(mix(vec3(gray), color.rgb, u_saturation), color.a);   
        }
          
    `;

    const program = CreateShader(gl, vert, frag);

    if (param === undefined || Object.values(param).length === 0) {
        param = {
            saturation: 1
        }
    }

    if (callback !== undefined && typeof callback === "function") {
        callback(param);
    }

    return (srcTexture, dstFbo) => BlitTexture(gl, srcTexture, dstFbo, program, gl.drawingBufferWidth, gl.drawingBufferHeight, () => {
        gl.uniform1f(gl.getUniformLocation(program, "u_saturation"), param.saturation);
    });
}

export function HueFilter(gl, param, callback) {
    const vert = defaultVertexShader;
    const frag = `#version 300 es
        precision mediump float;
        in vec2 v_texCoord;
        out vec4 fragColor;
          
        uniform sampler2D u_image;
        uniform float u_hue;
        
        void main() {
            vec4 color = texture(u_image, v_texCoord);
            // to hsv space(https://www.rapidtables.com/convert/color/hsv-to-rgb.html)
            float cmax = max(color.r, max(color.g, color.b));
            float cmin = min(color.r, min(color.g, color.b));
            float delta = cmax - cmin;
            
            float hue = delta == 0.0 ? 0.0 : cmax == color.r ? mod((color.g - color.b) / delta, 6.0) : cmax == color.g ? (color.b - color.r) / delta + 2.0 : (color.r - color.g) / delta + 4.0;
            hue *= 60.0;
            hue += u_hue;
            hue = mod(hue, 360.0);
            
            float saturation = cmax == 0.0 ? 0.0 : delta / cmax;
            float value = cmax;
            
            // to rgb space(https://www.rapidtables.com/convert/color/rgb-to-hsv.html)
            float c = value * saturation;
            float x = c * (1.0 - abs(mod(hue / 60.0, 2.0) - 1.0));
            float m = value - c;
            
            vec3 rgb = hue < 60.0 ? vec3(c, x, 0.0) : hue < 120.0 ? vec3(x, c, 0.0) : hue < 180.0 ? vec3(0.0, c, x) : hue < 240.0 ? vec3(0.0, x, c) : hue < 300.0 ? vec3(x, 0.0, c) : vec3(c, 0.0, x);
            fragColor = vec4(rgb + m, color.a);
       
        }
          
    `;

    const program = CreateShader(gl, vert, frag);

    if (param === undefined || Object.values(param).length === 0) {
        param = {
            hue: 0
        }
    }

    if (callback !== undefined && typeof callback === "function") {
        callback(param);
    }

    return (srcTexture, dstFbo) => BlitTexture(gl, srcTexture, dstFbo, program, gl.drawingBufferWidth, gl.drawingBufferHeight, () => {
        gl.uniform1f(gl.getUniformLocation(program, "u_hue"), param.hue);
    });
}

export function GreyScaleFilter(gl, param, callback) {
    const vert = defaultVertexShader;
    const frag = `#version 300 es
        precision mediump float;
        in vec2 v_texCoord;
        out vec4 fragColor;
        
        uniform sampler2D u_image;
        uniform float u_greyScale;
        
        void main() {
            vec4 color = texture(u_image, v_texCoord);
            float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
            fragColor = vec4(mix(vec3(gray), color.rgb, 1.0 - clamp(u_greyScale, 0.0, 1.0)), color.a);
        } 
    `;

    const program = CreateShader(gl, vert, frag);
    if (param === undefined || Object.values(param).length === 0) {
        param = {
            greyScale: 0
        }
    }
    param.greyScale = Clamp(param.greyScale, 0, 1);

    if (callback !== undefined && typeof callback === "function") {
        callback(param);
    }

    return (srcTexture, dstFbo) => BlitTexture(gl, srcTexture, dstFbo, program, gl.drawingBufferWidth, gl.drawingBufferHeight, () => {
        gl.uniform1f(gl.getUniformLocation(program, "u_greyScale"), param.greyScale);
    });
}

export function BoxBlurFilter(gl, param, callback) {
    const vert = defaultVertexShader;
    const frag = `#version 300 es
        precision mediump float;
        in vec2 v_texCoord;
        out vec4 fragColor;
        
        uniform sampler2D u_image;
        uniform vec2 u_radius;
        
        void main() {
            vec4 d = u_radius.xyxy * vec4(-1.0, -1.0, 1.0, 1.0);

            vec4 color = texture(u_image, v_texCoord + d.xy) * 0.25;
            color += texture(u_image, v_texCoord + d.zy) * 0.25;
            color += texture(u_image, v_texCoord + d.xw) * 0.25;
            color += texture(u_image, v_texCoord + d.zw) * 0.25;
            
            fragColor = color;   
        }
          
    `;

    const program = CreateShader(gl, vert, frag);
    const blitProgram = CreateShader(gl, defaultVertexShader, defaultFragmentShader);

    if (param === undefined || Object.values(param).length === 0) {
        param = {
            radius: 1.6, iterations: 3, downScale: 3
        }
    }

    if (callback !== undefined && typeof callback === "function") {
        callback(param);
    }

    const rtWidth = gl.drawingBufferWidth / param.downScale;
    const rtHeight = gl.drawingBufferHeight / param.downScale;

    const [fboA, texA] = CreateFrameBuffer(gl, rtWidth, rtHeight);
    const [fboB, texB] = CreateFrameBuffer(gl, rtWidth, rtHeight);

    const radiusWidth = param.radius / rtWidth;
    const radiusHeight = param.radius / rtHeight;

    return function (srcTexture, dstFbo) {
        BlitTexture(gl, srcTexture, fboA, blitProgram, rtWidth, rtHeight);

        for (let i = 0; i < param.iterations; i++) {
            BlitTexture(gl, texA, fboB, program, rtWidth, rtHeight, () => {
                gl.uniform2f(gl.getUniformLocation(program, "u_radius"), radiusWidth, radiusHeight);
            });

            BlitTexture(gl, texB, fboA, program, rtWidth, rtHeight, () => {
                gl.uniform2f(gl.getUniformLocation(program, "u_radius"), radiusWidth, radiusHeight);
            });
        }

        Blit(gl, fboA, dstFbo, rtWidth, rtHeight, gl.drawingBufferWidth, gl.drawingBufferHeight);
    }
}

// Parameters: radius, iterations, downScale
export function GaussianBlurFilter(gl, param, callback) {
    const vert = defaultVertexShader;
    const frag = `#version 300 es
        precision mediump float;
        in vec2 v_texCoord;
        out vec4 fragColor;
        
        uniform sampler2D u_image;
        uniform vec2 u_radius;
        
        void main() {
            // 高斯卷积核 1x7 7x1 [1, 6, 15, 20, 15, 6, 1]
           
            vec2 offset[7] = vec2[](
                vec2(0.0, 0.0),
                vec2(1.0, 1.0),
                vec2(2.0, 2.0),
                vec2(3.0, 3.0),
                vec2(-1.0, -1.0),
                vec2(-2.0, -2.0),
                vec2(-3.0, -3.0)
            );
            
            vec4 color = vec4(0.0);
            color += texture(u_image, v_texCoord + offset[0] * u_radius) * 0.3125;
            color += texture(u_image, v_texCoord + offset[1] * u_radius) * 0.234375;
            color += texture(u_image, v_texCoord + offset[2] * u_radius) * 0.09375;
            color += texture(u_image, v_texCoord + offset[3] * u_radius) * 0.015625;
            color += texture(u_image, v_texCoord + offset[4] * u_radius) * 0.234375;
            color += texture(u_image, v_texCoord + offset[5] * u_radius) * 0.09375;
            color += texture(u_image, v_texCoord + offset[6] * u_radius) * 0.015625;
            
            fragColor = color;
        }
    `;

    const program = CreateShader(gl, vert, frag);
    const blitProgram = CreateShader(gl, defaultVertexShader, defaultFragmentShader);

    if (param === undefined || Object.values(param).length === 0) {
        param = {
            radius: 1.6, iterations: 3, downScale: 3
        }
    }

    if (callback !== undefined && typeof callback === "function") {
        callback(param);
    }

    const rtWidth = gl.drawingBufferWidth / param.downScale;
    const rtHeight = gl.drawingBufferHeight / param.downScale;

    const [fboA, texA] = CreateFrameBuffer(gl, rtWidth, rtHeight);
    const [fboB, texB] = CreateFrameBuffer(gl, rtWidth, rtHeight);

    const radiusWidth = param.radius / rtWidth;
    const radiusHeight = param.radius / rtHeight;

    return function (srcTexture, dstFbo) {
        BlitTexture(gl, srcTexture, fboA, blitProgram, rtWidth, rtHeight);

        for (let i = 0; i < param.iterations; i++) {
            BlitTexture(gl, texA, fboB, program, rtWidth, rtHeight, () => {
                gl.uniform2f(gl.getUniformLocation(program, "u_radius"), radiusWidth, 0);
            });
            BlitTexture(gl, texB, fboA, program, rtWidth, rtHeight, () => {
                gl.uniform2f(gl.getUniformLocation(program, "u_radius"), 0, radiusHeight);
            });
        }

        Blit(gl, fboA, dstFbo, rtWidth, rtHeight, gl.drawingBufferWidth, gl.drawingBufferHeight);
    }
}

export function GrainyBlurFilter(gl, param, callback) {
    const vert = defaultVertexShader;
    const frag = `#version 300 es
        precision mediump float;
        in vec2 v_texCoord;
        out vec4 fragColor;
        
        uniform sampler2D u_image;
        uniform vec2 u_radius;
        uniform float u_iteration;
        
        float rand(vec2 n) {
            return sin(dot(n, vec2(1233.224, 1743.335)));
        }
        
        void main() {
            vec2 randomOffset = vec2(0.0);
            vec4 color = vec4(0.0);
            float random = rand(v_texCoord);
            int iteration = int(u_iteration);
            for (int i = 0; i < iteration; i++) {
                random = fract(43758.5453 * random + 0.61432);
                randomOffset.x = (random - 0.5) * 2.0;
                random = fract(43758.5453 * random + 0.61432);
                randomOffset.y = (random - 0.5) * 2.0;
                
                color += texture(u_image, v_texCoord + randomOffset * u_radius);
            }
            
            fragColor = color / u_iteration;
        }
    `;

    const program = CreateShader(gl, vert, frag);

    if (param === undefined || Object.values(param).length === 0) {
        param = {
            radius: 16, iterations: 8, downScale: 2
        }
    }

    if (callback !== undefined && typeof callback === "function") {
        callback(param);
    }

    const rtWidth = gl.drawingBufferWidth / param.downScale;
    const rtHeight = gl.drawingBufferHeight / param.downScale;

    const radiusWidth = param.radius / gl.drawingBufferWidth;
    const radiusHeight = param.radius / gl.drawingBufferHeight;

    const [fbo] = CreateFrameBuffer(gl, rtWidth, rtHeight);

    return (srcTexture, dstFbo) => {
        if (param.downScale === 1) {
            BlitTexture(gl, srcTexture, dstFbo, program, gl.drawingBufferWidth, gl.drawingBufferHeight, () => {
                gl.uniform2f(gl.getUniformLocation(program, "u_radius"), radiusWidth, radiusHeight);
                gl.uniform1f(gl.getUniformLocation(program, "u_iteration"), param.iterations);
            });
        } else {
            BlitTexture(gl, srcTexture, fbo, program, rtWidth, rtHeight, () => {
                gl.uniform2f(gl.getUniformLocation(program, "u_radius"), radiusWidth, radiusHeight);
                gl.uniform1f(gl.getUniformLocation(program, "u_iteration"), param.iterations);
            });
            Blit(gl, fbo, dstFbo, rtWidth, rtHeight, gl.drawingBufferWidth, gl.drawingBufferHeight);
        }
    };
}

export function GranTurismoFilter(gl, param, callback) {
    const vert = defaultVertexShader;
    const frag = `#version 300 es
precision mediump float;
in vec2 v_texCoord;
out vec4 fragColor;

uniform float u_intensity;
uniform sampler2D u_image;
const float e = 2.71828;

float W_f(float x, float e0, float e1)
{
    if (x <= e0)
    return 0.0;
    if (x >= e1)
    return 1.0;
    float a = (x - e0) / (e1 - e0);
    return a * a * (3.0 - 2.0 * a);
}

float H_f(float x, float e0, float e1)
{
    if (x <= e0)
    return 0.0;
    if (x >= e1)
    return 1.0;
    return (x - e0) / (e1 - e0);
}

float GranTurismo(float x)
{
    float P = 1.0;
    float a = 1.0;
    float m = 0.22;
    float l = 0.4;
    float c = 1.33;
    float b = 0.0;
    float l0 = (P - m) * l / a;
    float L0 = m - m / a;
    float L1 = m + (1.0 - m) / a;
    float L_x = m + a * (x - m);
    float T_x = m * pow(x / m, c) + b;
    float S0 = m + l0;
    float S1 = m + a * l0;
    float C2 = a * P / (P - S1);
    float S_x = P - (P - S1) * pow(e, -(C2 * (x - S0) / P));
    float w0_x = 1.0 - W_f(x, 0.0, m);
    float w2_x = H_f(x, m + l0, m + l0);
    float w1_x = 1.0 - w0_x - w2_x;
    float f_x = T_x * w0_x + L_x * w1_x + S_x * w2_x;
    return f_x;
}

vec4 GranTurismo(vec4 x)
{
    vec4 color = vec4(GranTurismo(x.r), GranTurismo(x.g), GranTurismo(x.b), x.a);
    return mix(x, color, u_intensity);
}


void main() {
    vec4 color = texture(u_image, v_texCoord);
    fragColor = GranTurismo(color);
}
    `;

    const program = CreateShader(gl, vert, frag);
    if (param === undefined || Object.values(param).length === 0) {
        param = {
            intensity: 1
        }
    }

    param.intensity = Clamp(param.intensity, 0, 1);

    if (callback !== undefined && typeof callback === "function") {
        callback(param);
    }

    return (srcTexture, dstFbo) => BlitTexture(gl, srcTexture, dstFbo, program, gl.drawingBufferWidth, gl.drawingBufferHeight, () => {
        gl.uniform1f(gl.getUniformLocation(program, "u_intensity"), param.intensity);
    });
}

export function EdgeDetectionFilter(gl, param, callback) {
    // Sobel算子
    const vert = `#version 300 es
    precision mediump float;
    in vec2 a_position;
    in vec2 a_texCoord;
    out vec2 v_texCoord;
    out vec2[9] v_uv;
    
    uniform vec2 u_textureSize;
    
    void main() {
        v_texCoord = vec2(a_texCoord.x, a_texCoord.y);
        gl_Position = vec4(a_position.xy, 0.0, 1.0);
        
        vec2 texel = vec2(1.0 / u_textureSize.x, 1.0 / u_textureSize.y);
        v_uv[0] = v_texCoord + texel * vec2(-1.0, -1.0);
        v_uv[1] = v_texCoord + texel * vec2( 0.0, -1.0);
        v_uv[2] = v_texCoord + texel * vec2( 1.0, -1.0);
        v_uv[3] = v_texCoord + texel * vec2(-1.0,  0.0);
        v_uv[4] = v_texCoord + texel * vec2( 0.0,  0.0);
        v_uv[5] = v_texCoord + texel * vec2( 1.0,  0.0);
        v_uv[6] = v_texCoord + texel * vec2(-1.0,  1.0); 
        v_uv[7] = v_texCoord + texel * vec2( 0.0,  1.0);
        v_uv[8] = v_texCoord + texel * vec2( 1.0,  1.0);
    }
`;
    const frag = `#version 300 es
    precision mediump float;
    in vec2 v_texCoord;
    in vec2[9] v_uv;
    
    out vec4 fragColor;
    
    uniform sampler2D u_image;
    uniform float u_intensity;
    uniform vec3 u_edgeColor;
    uniform vec3 u_backgroundColor;
    uniform int u_edgeOnly;
    
    float luminance(vec3 color) {
        return dot(color, vec3(0.2126, 0.7152, 0.0722));
    }
    
    float sobel() {
        const float gx[9] = float[9](
            -1.0, 0.0, 1.0,
            -2.0, 0.0, 2.0,
            -1.0, 0.0, 1.0
        );
        
        const float gy[9] = float[9](
            -1.0, -2.0, -1.0,
            0.0, 0.0, 0.0,
            1.0, 2.0, 1.0
        );
        
        float color = 0.0, edgeX = 0.0, edgeY = 0.0;
        
        for (int i = 0; i < 9; i++) {
            color = luminance(texture(u_image, v_uv[i]).rgb);
            edgeX += color * gx[i];
            edgeY += color * gy[i];
        }
        
        return 1.0 - sqrt(edgeX * edgeX + edgeY * edgeY);
    }
    
    void main() {
        float edge = sobel();
        edge = smoothstep(0.0, 1.0, edge);
        vec3 color = texture(u_image, v_texCoord).rgb;
        vec3 withEdgeColor = mix(mix(u_edgeColor, color, edge), color, 1.0 - u_intensity);
        vec3 onlyEdgeColor = mix(u_edgeColor, u_backgroundColor, edge);
        
        fragColor = vec4(mix(withEdgeColor, onlyEdgeColor, float(u_edgeOnly)), 1.0);
    }
    `;

    const program = CreateShader(gl, vert, frag);
    if (param === undefined || Object.values(param).length === 0) {
        param = {
            intensity: 0.5,
            edgeColor: [0, 0, 0],
            backgroundColor: [255, 255, 255],
            edgeOnly: true
        }
    }

    param.edgeColor = param.edgeColor.map(v => Clamp(v, 0, 255) / 255);
    param.backgroundColor = param.backgroundColor.map(v => Clamp(v, 0, 255) / 255);
    param.edgeOnly = param.edgeOnly ? 1 : 0;

    if (callback !== undefined && typeof callback === "function") {
        callback(param);
    }

    return (srcTexture, dstFbo) => BlitTexture(gl, srcTexture, dstFbo, program, gl.drawingBufferWidth, gl.drawingBufferHeight, () => {
        gl.uniform1f(gl.getUniformLocation(program, "u_intensity"), param.intensity);
        gl.uniform3fv(gl.getUniformLocation(program, "u_edgeColor"), param.edgeColor);
        gl.uniform3fv(gl.getUniformLocation(program, "u_backgroundColor"), param.backgroundColor);
        gl.uniform1i(gl.getUniformLocation(program, "u_edgeOnly"), param.edgeOnly);
        gl.uniform2f(gl.getUniformLocation(program, "u_textureSize"), gl.drawingBufferWidth, gl.drawingBufferHeight);
    });
}

export function BinarizationFilter(gl, param, callback) {
    const vert = defaultVertexShader;
    const frag = `#version 300 es
    precision mediump float;
    in vec2 v_texCoord;
    out vec4 fragColor;
    uniform sampler2D u_image;
    uniform float u_threshold;
    void main() {
        vec4 color = texture(u_image, v_texCoord);
        float luminance = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
        float binarized = step(u_threshold, luminance);
        fragColor = vec4(vec3(binarized), 1.0);
    }
    `;

    const program = CreateShader(gl, vert, frag);
    if (param === undefined || Object.values(param).length === 0) {
        param = {
            threshold: 0.5
        }
    }

    param.threshold = Clamp(param.threshold, 0, 1);

    if (callback !== undefined && typeof callback === "function") {
        callback(param);
    }

    return (srcTexture, dstFbo) => BlitTexture(gl, srcTexture, dstFbo, program, gl.drawingBufferWidth, gl.drawingBufferHeight, () => {
        gl.uniform1f(gl.getUniformLocation(program, "u_threshold"), param.threshold);
    });
}