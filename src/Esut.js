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

        // 获取着色器程序中的变量
        const positionLocation = this.gl.getAttribLocation(this.biltShader, "a_position");
        const textureLocation = this.gl.getAttribLocation(this.biltShader, "a_texCoord");

        // 启用顶点属性
        this.gl.enableVertexAttribArray(positionLocation);
        this.gl.enableVertexAttribArray(textureLocation);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
        this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, textureBuffer);
        this.gl.vertexAttribPointer(textureLocation, 2, this.gl.FLOAT, false, 0, 0);
    }

    updateGL() {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.frameBufferA);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.glTexture);
        this.gl.uniform1i(this.gl.getUniformLocation(this.biltShader, "u_texture"), 0);

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.frameBufferA);
        this.gl.viewport(0, 0, this.glCanvas.width, this.glCanvas.height);
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);

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

        // 最后一次写到屏幕
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        this.gl.viewport(0, 0, this.glCanvas.width, this.glCanvas.height);
        this.gl.useProgram(this.biltShader);
        this.gl.bindTexture(this.gl.TEXTURE_2D, srcTexture);
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    }

    constructor(props) {
        super(props);
        this.canvasRef = React.createRef();
        this.time = 0;

        this.state = {
            imgUrl: this.props.imgUrl,
            filters: this.props.filters || [],
            isStatic: this.props.isStatic || false
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
                return obj.filter(this.gl, obj.params);
            });

            this.updateGL();

            if (!this.state.isStatic) this.update();
        }

    }

    update() {
        this.updateGL();
        requestAnimationFrame(this.update.bind(this));
    }

    render() {
        return <canvas ref={this.canvasRef} style={this.props.style}/>
    }
}

/* Utility */

const defaultVertexShader = `#version 300 es
    precision mediump float;
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

function Blit(gl, src, dst, width, height) {
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, src);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, dst);
    gl.blitFramebuffer(0, 0, width, height, 0, 0, width, height, gl.COLOR_BUFFER_BIT, gl.LINEAR);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function CreateShader(gl, vert, frag) {
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
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    return [frameBuffer, texture];
}


/* Filters */

export function WaveFilter(gl, param) {
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
    setInterval(() => {
        time += 1000 / 60;
    }, 1000 / 60);

    if (param === null || param === undefined) {
        param = {
            amplitude: 0.2, frequency: 2, speed: 1,
        }
    }

    return function (srcTexture, dstFbo) {
        gl.useProgram(program);
        gl.bindFramebuffer(gl.FRAMEBUFFER, dstFbo);
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.clearColor(0, 0, 0, 0);

        gl.bindTexture(gl.TEXTURE_2D, srcTexture);
        gl.uniform1i(gl.getUniformLocation(program, "u_image"), 0);
        gl.uniform1f(gl.getUniformLocation(program, "u_time"), time);
        gl.uniform2f(gl.getUniformLocation(program, "u_textureSize"), gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.uniform1f(gl.getUniformLocation(program, "u_amplitude"), param.amplitude);
        gl.uniform1f(gl.getUniformLocation(program, "u_frequency"), param.frequency);
        gl.uniform1f(gl.getUniformLocation(program, "u_speed"), param.speed);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

}

export function BoxBlurFilter(gl, param) {
    const vert = defaultVertexShader;
    const frag = `#version 300 es
        precision mediump float;
        in vec2 v_texCoord;
        out vec4 fragColor;
        
        uniform sampler2D u_image;
        uniform vec2 u_textureSize;
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

    if (param === null || param === undefined) {
        param = {
            radius: 1.6, iterations: 3, downScale: 3
        }
    }

    const rtWidth = gl.drawingBufferWidth / param.downScale;
    const rtHeight = gl.drawingBufferHeight / param.downScale;

    const [faoA, texA] = CreateFrameBuffer(gl, rtWidth, rtHeight);
    const [faoB, texB] = CreateFrameBuffer(gl, rtWidth, rtHeight);

    const radiusWidth = param.radius / rtWidth;
    const radiusHeight = param.radius / rtHeight;

    return function (srcTexture, dstFbo) {
        gl.useProgram(blitProgram);
        gl.bindFramebuffer(gl.FRAMEBUFFER, faoA);
        gl.viewport(0, 0, rtWidth, rtHeight);
        gl.clearColor(0, 0, 0, 0);

        gl.bindTexture(gl.TEXTURE_2D, srcTexture);
        gl.uniform1i(gl.getUniformLocation(blitProgram, "u_image"), 0);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        for (let i = 0; i < param.iterations; i++) {
            gl.useProgram(program);
            gl.bindFramebuffer(gl.FRAMEBUFFER, faoB);
            gl.viewport(0, 0, rtWidth, rtHeight);
            gl.clearColor(0, 0, 0, 0);

            gl.bindTexture(gl.TEXTURE_2D, texA);
            gl.uniform1i(gl.getUniformLocation(program, "u_image"), 0);
            gl.uniform2f(gl.getUniformLocation(program, "u_textureSize"), gl.drawingBufferWidth, gl.drawingBufferHeight);
            gl.uniform2f(gl.getUniformLocation(program, "u_radius"), radiusWidth, radiusHeight);

            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

            gl.bindFramebuffer(gl.FRAMEBUFFER, faoA);
            gl.viewport(0, 0, rtWidth, rtHeight);
            gl.clearColor(0, 0, 0, 0);

            gl.bindTexture(gl.TEXTURE_2D, texB);
            gl.uniform1i(gl.getUniformLocation(program, "u_image"), 0);
            gl.uniform2f(gl.getUniformLocation(program, "u_textureSize"), gl.drawingBufferWidth, gl.drawingBufferHeight);
            gl.uniform2f(gl.getUniformLocation(program, "u_radius"), radiusWidth, radiusHeight);

            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        }

        gl.useProgram(blitProgram);
        gl.bindFramebuffer(gl.FRAMEBUFFER, dstFbo);
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.clearColor(0, 0, 0, 0);

        gl.bindTexture(gl.TEXTURE_2D, texA);
        gl.uniform1i(gl.getUniformLocation(blitProgram, "u_image"), 0);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
}

export function RevertFilter(gl, param) {
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

    return function (srcTexture, dstFbo) {
        gl.useProgram(program);
        gl.bindFramebuffer(gl.FRAMEBUFFER, dstFbo);
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.clearColor(0, 0, 0, 0);

        gl.bindTexture(gl.TEXTURE_2D, srcTexture);
        gl.uniform1i(gl.getUniformLocation(program, "u_image"), 0);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

}

export function TintFilter(gl, param) {
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

    if (param === null || param === undefined) {
        param = {
            tint: [1, 1, 1]
        }
    }

    return function (srcTexture, dstFbo) {
        gl.useProgram(program);
        gl.bindFramebuffer(gl.FRAMEBUFFER, dstFbo);
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.clearColor(0, 0, 0, 0);

        gl.bindTexture(gl.TEXTURE_2D, srcTexture);
        gl.uniform1i(gl.getUniformLocation(program, "u_image"), 0);
        gl.uniform3f(gl.getUniformLocation(program, "u_tint"), param.tint[0], param.tint[1], param.tint[2]);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
}

export function BrightnessFilter(gl, param) {
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

    if (param === null || param === undefined) {
        param = {
            brightness: 1
        }
    }

    return function (srcTexture, dstFbo) {
        gl.useProgram(program);
        gl.bindFramebuffer(gl.FRAMEBUFFER, dstFbo);
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.clearColor(0, 0, 0, 0);

        gl.bindTexture(gl.TEXTURE_2D, srcTexture);
        gl.uniform1i(gl.getUniformLocation(program, "u_image"), 0);
        gl.uniform1f(gl.getUniformLocation(program, "u_brightness"), param.brightness);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
}

export function ContrastFilter(gl, param) {
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

    if (param === null || param === undefined) {
        param = {
            contrast: 1
        }
    }

    return function (srcTexture, dstFbo) {
        gl.useProgram(program);
        gl.bindFramebuffer(gl.FRAMEBUFFER, dstFbo);
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.clearColor(0, 0, 0, 0);

        gl.bindTexture(gl.TEXTURE_2D, srcTexture);
        gl.uniform1i(gl.getUniformLocation(program, "u_image"), 0);
        gl.uniform1f(gl.getUniformLocation(program, "u_contrast"), param.contrast);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
}

export function SaturationFilter(gl, param) {
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

    if (param === null || param === undefined) {
        param = {
            saturation: 1
        }
    }

    return function (srcTexture, dstFbo) {
        gl.useProgram(program);
        gl.bindFramebuffer(gl.FRAMEBUFFER, dstFbo);
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.clearColor(0, 0, 0, 0);

        gl.bindTexture(gl.TEXTURE_2D, srcTexture);
        gl.uniform1i(gl.getUniformLocation(program, "u_image"), 0);
        gl.uniform1f(gl.getUniformLocation(program, "u_saturation"), param.saturation);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
}

export function HueFilter(gl, param) {
    const vert = defaultVertexShader;
    const frag = `#version 300 es
        precision mediump float;
        in vec2 v_texCoord;
        out vec4 fragColor;
          
        uniform sampler2D u_image;
        uniform float u_hue;
        
        void main() {
            vec4 color = texture(u_image, v_texCoord);
            float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
            fragColor = vec4(mix(vec3(gray), color.rgb, u_hue), color.a);   
        }
          
    `;

    const program = CreateShader(gl, vert, frag);

    if (param === null || param === undefined) {
        param = {
            hue: 1
        }
    }

    return function (srcTexture, dstFbo) {
        gl.useProgram(program);
        gl.bindFramebuffer(gl.FRAMEBUFFER, dstFbo);
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.clearColor(0, 0, 0, 0);

        gl.bindTexture(gl.TEXTURE_2D, srcTexture);
        gl.uniform1i(gl.getUniformLocation(program, "u_image"), 0);
        gl.uniform1f(gl.getUniformLocation(program, "u_hue"), param.hue);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
}