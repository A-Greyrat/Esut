# Esut
## A library for processing pictures

### usage
```jsx
<WebglCanvas imgUrl="./5.jpg"
             filters={[{filter: BoxBlurFilter, params:{
                    radius: 4,
                    iterations: 3,
                    downScale: 3
             }}]}
             style={{objectFit: "cover", width: "100%", height: "100%", position: "fixed",}}
             isStatic={true}/>
```
