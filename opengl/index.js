jQuery(document).ready(function($) {
    var canvas = $('#canvas1')[0]// = document.getElementById('canvas1')

    var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    gl.viewport(0, 0, canvas.width, canvas.height)

    var glExt = gl.getExtension('OES_vertex_array_object')

    var keyState = {}
    $(document).keydown(function(e){
        keyState[e.which] = true
    }).keyup(function(e){
        delete keyState[e.which]
    })

    var update = function(){}
    function degToRad(angle){ return angle / 180 * 3.141592; }

    var lastUpdate = Date.now()
    var timer = setInterval(function() {
        var now = Date.now()
        var dt = now - lastUpdate
        lastUpdate = now

        // clear
        gl.clearColor(0.3, 0.3, 0.3, 1.0)
        gl.enable(gl.DEPTH_TEST)
        gl.depthFunc(gl.LEQUAL)
        gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT)

        update(dt)
    }, 0)

    function loadFile(url, data, callback, errCallback){
        var req = new XMLHttpRequest()
        req.open('GET', url, true)

        req.onreadystatechange = function(){
            if(req.readyState != 4) return;

            if(req.status == 0 || req.status == 200){
                callback(req.responseText, data)
            }else{
                errCallback(url)
            }
        }

        req.send(null)
    }
    function loadFiles(urls, callback, errCallback){
        var numUrls = urls.length
        var numComplete = 0
        var result = []

        function partialCallback(text, urlIndex){
            result[urlIndex] = text
            numComplete++

            if(numComplete == numUrls)
                callback(result)
        }

        for(var i = 0; i < numUrls; i++)
            loadFile(urls[i], i, partialCallback, errCallback)
    }

    function GLProg(){
        this.handle = 0
        this.uniformLocations = {}
    }
    GLProg.create = function(vs, fs, attrs){
        var prg = new GLProg()
        prg.compileShader(vs, gl.VERTEX_SHADER)
        prg.compileShader(fs, gl.FRAGMENT_SHADER)

        for(var i = 0; i < attrs.length; i++)
            prg.bindAttribLocation(i, attrs[i])

        prg.link()

        return prg
    }
    GLProg.asyncReady = function(vs, fs, attrs, callback){
        loadFiles([vs, fs], function(context){
            var prg = new GLProg()

            prg.compileShaderForSource(context[0], gl.VERTEX_SHADER)
            prg.compileShaderForSource(context[1], gl.FRAGMENT_SHADER)

            for(var i = 0; i < attrs.length; i++)
                prg.bindAttribLocation(i, attrs[i])

            prg.link()

            callback(prg)
        }, function(url){
            alert('Failed to download: ' + url)
        })
    }
    GLProg.prototype = {
        compileShader:function(contentName, type){
            this.compileShaderForSource($('#' + contentName)[0].textContent, type)
        },

        compileShaderForSource:function(source, type){
            if(this.handle <= 0){
                this.handle = gl.createProgram()
            }

            var shaderHandle = gl.createShader(type)
            gl.shaderSource(shaderHandle, source)
            gl.compileShader(shaderHandle)

            gl.attachShader(this.handle, shaderHandle)
        },

        link:function(){
            gl.linkProgram(this.handle)

            if (!gl.getProgramParameter(this.handle, gl.LINK_STATUS)) {
                alert(gl.getProgramInfoLog(this.handle))
                //console.error('Link Error : ' + gl.getProgramInfoLog(this.handle))
                //gl.deleteProgram(this.handle)
            }
        },

        use:function(){
            gl.useProgram(this.handle)
        },

        bindAttribLocation:function(local, name){
            gl.bindAttribLocation(this.handle, local, name)
        },

        setUniform1i:function(name, v){
            var local = this.getUniformLocation(name)
            gl.uniform1i(local, v)
        },

        setUniform1f:function(name, v){
            var local = this.getUniformLocation(name)
            gl.uniform1f(local, v)
        },

        setUniform3f:function(name, x, y, z){
            var local = this.getUniformLocation(name)
            gl.uniform3f(local, x, y, z)
        },

        setUniform4f:function(name, x, y, z, w){
            var local = this.getUniformLocation(name)
            gl.uniform4f(local, x, y, z, w)
        },

        setUniformVec3:function(name, v){
            this.setUniform3f(name, v[0], v[1], v[2])
        },

        setUniformVec4:function(name, v){
            this.setUniform4f(name, v[0], v[1], v[2], v[3])
        },

        setUniformMat3:function(name, mat3){
            var local = this.getUniformLocation(name)
            gl.uniformMatrix3fv(local, false, mat3)
        },

        setUniformMat4:function(name, mat4){
            var local = this.getUniformLocation(name)
            gl.uniformMatrix4fv(local, false, mat4)
        },

        getUniformLocation:function(name){
            if(this.uniformLocations[name] == null)
                this.uniformLocations[name] = gl.getUniformLocation(this.handle, name)
            return this.uniformLocations[name]
        },
    }

    function VAOTriangle(){
        this.vaoHandle = glExt.createVertexArrayOES()
        glExt.bindVertexArrayOES(this.vaoHandle)

        this.vboHandle = []

        var vertices = [
            0.0, 1.0, 0.0,
            -1.0, -1.0, 0.0,
            1.0, -1.0, 0.0,
        ]

        this.vboHandle[0] = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vboHandle[0])
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW)
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0)
        gl.enableVertexAttribArray(0)

        var colors = [
            1.0, 0.0, 0.0, 1.0,
            0.0, 1.0, 0.0, 1.0,
            0.0, 0.0, 1.0, 1.0
        ]
        this.vboHandle[1] = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vboHandle[1])
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW)
        gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0)
        gl.enableVertexAttribArray(1)

        glExt.bindVertexArrayOES(null)
    }
    VAOTriangle.prototype = {
        render:function(){
            glExt.bindVertexArrayOES(this.vaoHandle)
            gl.drawArrays(gl.TRIANGLES, 0, 3)
            glExt.bindVertexArrayOES(null)
        }
    }

    function VAOSquare(){
        this.vaoHandle = glExt.createVertexArrayOES()
        glExt.bindVertexArrayOES(this.vaoHandle)

        this.vboHandle = []

        var vertices = [
            1.0,  1.0,  0.0,
            -1.0,  1.0,  0.0,
            1.0, -1.0,  0.0,
            -1.0, -1.0,  0.0
        ]
        this.vboHandle[0] = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vboHandle[0])
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW)
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0)
        gl.enableVertexAttribArray(0)

        var texCoords = [
            1.0, 1.0,
            0.0, 1.0,
            1.0, 0.0,
            0.0, 0.0,
        ]
        this.vboHandle[1] = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vboHandle[1])
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW)
        gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0)
        gl.enableVertexAttribArray(1)

        glExt.bindVertexArrayOES(null)
    }
    VAOSquare.prototype = {
        render:function(){
            glExt.bindVertexArrayOES(this.vaoHandle)
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
            glExt.bindVertexArrayOES(null)
        }
    }

    function VAOCube(){
        this.vaoHandle = glExt.createVertexArrayOES()
        glExt.bindVertexArrayOES(this.vaoHandle)

        this.vboHandle = []

        var side2 = 0.5
        var vertices = [
            // Front
            -side2, -side2, side2,
             side2, -side2, side2,
             side2,  side2, side2,
            -side2,  side2, side2,
            // Right
             side2, -side2, side2,
             side2, -side2, -side2,
             side2,  side2, -side2,
             side2,  side2, side2,
            // Back
            -side2, -side2, -side2,
            -side2,  side2, -side2,
             side2,  side2, -side2,
             side2, -side2, -side2,
            // Left
            -side2, -side2, side2,
            -side2,  side2, side2,
            -side2,  side2, -side2,
            -side2, -side2, -side2,
            // Bottom
            -side2, -side2, side2,
            -side2, -side2, -side2,
             side2, -side2, -side2,
             side2, -side2, side2,
            // Top
            -side2,  side2, side2,
             side2,  side2, side2,
             side2,  side2, -side2,
            -side2,  side2, -side2
        ]
        this.vboHandle[0] = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vboHandle[0])
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW)
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0)
        gl.enableVertexAttribArray(0)

        var normal = [
            // Front
            0.0, 0.0, 1.0,
            0.0, 0.0, 1.0,
            0.0, 0.0, 1.0,
            0.0, 0.0, 1.0,
            // Right
            1.0, 0.0, 0.0,
            1.0, 0.0, 0.0,
            1.0, 0.0, 0.0,
            1.0, 0.0, 0.0,
            // Back
            0.0, 0.0, -1.0,
            0.0, 0.0, -1.0,
            0.0, 0.0, -1.0,
            0.0, 0.0, -1.0,
            // Left
            -1.0, 0.0, 0.0,
            -1.0, 0.0, 0.0,
            -1.0, 0.0, 0.0,
            -1.0, 0.0, 0.0,
            // Bottom
            0.0, -1.0, 0.0,
            0.0, -1.0, 0.0,
            0.0, -1.0, 0.0,
            0.0, -1.0, 0.0,
            // Top
            0.0, 1.0, 0.0,
            0.0, 1.0, 0.0,
            0.0, 1.0, 0.0,
            0.0, 1.0, 0.0
        ]
        this.vboHandle[1] = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vboHandle[1])
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normal), gl.STATIC_DRAW)
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0)
        gl.enableVertexAttribArray(1)

        var tex = [
            // Front
            0.0, 0.0,
            1.0, 0.0,
            1.0, 1.0,
            0.0, 1.0,
            // Right
            0.0, 0.0,
            1.0, 0.0,
            1.0, 1.0,
            0.0, 1.0,
            // Back
            0.0, 0.0,
            1.0, 0.0,
            1.0, 1.0,
            0.0, 1.0,
            // Left
            0.0, 0.0,
            1.0, 0.0,
            1.0, 1.0,
            0.0, 1.0,
            // Bottom
            0.0, 0.0,
            1.0, 0.0,
            1.0, 1.0,
            0.0, 1.0,
            // Top
            0.0, 0.0,
            1.0, 0.0,
            1.0, 1.0,
            0.0, 1.0
        ]
        this.vboHandle[2] = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vboHandle[2])
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(tex), gl.STATIC_DRAW)
        gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0)
        gl.enableVertexAttribArray(2)

        var indices = [
            0,1,2,0,2,3,
            4,5,6,4,6,7,
            8,9,10,8,10,11,
            12,13,14,12,14,15,
            16,17,18,16,18,19,
            20,21,22,20,22,23
        ]
        this.vboHandle[3] = gl.createBuffer()
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.vboHandle[3])
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW)

        this.numIndices = indices.length

        glExt.bindVertexArrayOES(null)
    }
    VAOCube.prototype = {
        render:function(){
            glExt.bindVertexArrayOES(this.vaoHandle)
            gl.drawElements(gl.TRIANGLES, this.numIndices, gl.UNSIGNED_SHORT, 0)
            glExt.bindVertexArrayOES(null)
        }
    }

    function VAOTorus(outerRadius, innerRadius, rings, sides){
        var obj = this.genObj(outerRadius, innerRadius, rings, sides)

        this.vaoHandle = glExt.createVertexArrayOES()
        glExt.bindVertexArrayOES(this.vaoHandle)

        this.vboHandle = []

        this.vboHandle[0] = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vboHandle[0])
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(obj.verts), gl.STATIC_DRAW)
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0)
        gl.enableVertexAttribArray(0)

        this.vboHandle[1] = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vboHandle[1])
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(obj.norms), gl.STATIC_DRAW)
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0)
        gl.enableVertexAttribArray(1)

        this.vboHandle[2] = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vboHandle[2])
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(obj.tex), gl.STATIC_DRAW)
        gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0)
        gl.enableVertexAttribArray(2)

        this.vboHandle[3] = gl.createBuffer()
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.vboHandle[3])
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(obj.el), gl.STATIC_DRAW)
        this.numIndices = obj.el.length

        glExt.bindVertexArrayOES(null)
    }
    VAOTorus.prototype = {
        genObj:function(outerRadius, innerRadius, rings, sides){
            var norms = [], verts = [], tex = [], el = []

            var ringFactor = Math.PI * 2.0 / rings
            var sideFactor = Math.PI * 2.0 / sides
            var idx = 0, tidx = 0

            for(var ring = 0; ring <= rings; ring++){
                var u = ring * ringFactor
                var cu = Math.cos(u)
                var su = Math.sin(u)

                for(var side = 0; side < sides; side++){
                    var v = side * sideFactor
                    var cv = Math.cos(v)
                    var sv = Math.sin(v)
                    var r = (outerRadius + innerRadius * cv)

                    verts[idx] = r * cu
                    verts[idx + 1] = r * su
                    verts[idx + 2] = innerRadius * sv

                    var norm = vec3.create([cv*cu*r, cv*su*r, sv*r])
                    vec3.normalize(norm)
                    norms[idx] = norm[0]
                    norms[idx + 1] = norm[1]
                    norms[idx + 2] = norm[2]
                    idx += 3

                    tex[tidx] = u / Math.PI * 2
                    tex[tidx + 1] = v / Math.PI * 2
                    tidx += 2
                }
            }

            idx = 0
            for(var ring = 0; ring < rings; ring++){
                var ringStart = ring * sides
                var nextRingStart = (ring + 1) * sides
                for(var side = 0; side < sides; side++){
                    var nextSide = (side + 1) % sides

                    // quad
                    el[idx] = ringStart + side
                    el[idx + 1] = nextRingStart + side
                    el[idx + 2] = nextRingStart + nextSide

                    el[idx + 3] = ringStart + side
                    el[idx + 4] = nextRingStart + nextSide
                    el[idx + 5] = ringStart + nextSide

                    idx += 6
                }
            }

            return {
                verts:verts,
                norms:norms,
                tex:tex,
                el:el,
            }
        },

        render:function(){
            glExt.bindVertexArrayOES(this.vaoHandle)
            gl.drawElements(gl.TRIANGLES, this.numIndices, gl.UNSIGNED_SHORT, 0)
            glExt.bindVertexArrayOES(null)
        }
    }


    function addScene(btnName, callback){
        var btn = $('<button/>', {'id':btnName, 'class':'btn btn-default'})
        btn.text(btnName).width(80).on('click', function(){
            gl.enable(gl.DEPTH_TEST)
            gl.disable(gl.BLEND)

            $('#control-panel').empty()
            update = function(){}
            callback()
        })
        $('#scene-list').append($('<li/>').append(btn))
    }
    function addControlButton(btnName, callback){
        var btn = $('<button/>', {'id':btnName, 'class':'btn btn-default'})
        btn.text(btnName).on('click', callback)
        $('#control-panel').append(btn)
    }

    addScene('scene1', function(){
        var prg = new GLProg()
        prg.compileShader('shader-vs1', gl.VERTEX_SHADER)
        prg.compileShader('shader-fs1', gl.FRAGMENT_SHADER)
        prg.bindAttribLocation(0, 'aVertexPosition')
        prg.bindAttribLocation(1, 'aVertexColor')
        prg.link()
        prg.use()

        var vaoTriangle = new VAOTriangle()
        var vaoSquare = new VAOSquare()

        var mvMatrix = mat4.create()
        var mvMatrixStack = []
        function mvPushMatrix(){
            var copy = mat4.create()
            mat4.set(mvMatrix, copy)
            mvMatrixStack.push(copy)
        }

        function mvPopMatrix(){
            mvMatrix = mvMatrixStack.pop()
        }

        var pMatrix = mat4.create()
        mat4.perspective(45, canvas.width / canvas.height, 0.1, 100.0, pMatrix)

        var tri = 0

        update = function(dt) {
            mat4.identity(mvMatrix)

            // draw triangle
            mat4.translate(mvMatrix, [-1.5, 0.0, -7.0])

            mvPushMatrix()
                tri += dt / 500
                mat4.rotate(mvMatrix, tri * 30 * Math.PI / 180, [0, 1, 0])
                prg.setUniformMat4('uPMatrix', pMatrix)
                prg.setUniformMat4('uMVMatrix', mvMatrix)
                vaoTriangle.render()
            mvPopMatrix()

            // draw square
            mat4.translate(mvMatrix, [3.0, 0.0, 0.0])
            mat4.rotateZ(mvMatrix, Date.now() / 300 % 360)
            prg.setUniformMat4('uPMatrix', pMatrix)
            prg.setUniformMat4('uMVMatrix', mvMatrix)
            vaoSquare.render()
        }
    })

    addScene('scene2', function(){
        var prg = new GLProg()
        prg.compileShader('shader-vs1', gl.VERTEX_SHADER)
        prg.compileShader('shader-fs1', gl.FRAGMENT_SHADER)
        prg.bindAttribLocation(0, 'aVertexPosition')
        prg.bindAttribLocation(1, 'aVertexColor')
        prg.link()
        prg.use()

        var vaoCube = new VAOCube()

        var mvMatrix = mat4.create()
        var pMatrix = mat4.create()
        mat4.perspective(45, canvas.width / canvas.height, 0.1, 100.0, pMatrix)

        var dtRotX = 0
        var dtRotY = 0
        var rotX = 0
        var rotY = 0
        addControlButton('X', function(){ dtRotX = 1 - dtRotX })
        addControlButton('Y', function(){ dtRotY = 1 - dtRotY })

        update = function(dt){
            rotX += dtRotX * dt * 0.2
            rotY += dtRotY * dt * 0.2

            mat4.identity(mvMatrix)
            mat4.translate(mvMatrix, [0.0, 0.0, -7.0])
            //mat4.rotate(mvMatrix, tri * 30 * Math.PI / 180, [1, 1, 0])
            mat4.rotateX(mvMatrix, rotX * Math.PI / 180)
            mat4.rotateY(mvMatrix, rotY * Math.PI / 180)

            prg.setUniformMat4('uPMatrix', pMatrix)
            prg.setUniformMat4('uMVMatrix', mvMatrix)
            vaoCube.render()
        }
    })

    addScene('scene3', function(){
        GLProg.asyncReady('ads.vs.txt', 'ads.fs.txt',
            ['VertexPos', 'Normal', 'TexCoord'], function(prg){
            prg.use()

            var vaoTorus = new VAOTorus(0.7, 0.3, 50, 50)

            var pMat = mat4.perspective(70, canvas.width / canvas.height, 0.3, 100.0, [])
            var vMat = mat4.lookAt([0.0, 2.0, 2.0], [0.0, 0.0, 0.0], [0.0, 1.0, 0.0])
            var mMat = mat4.create()

            prg.setUniformVec4('LightPos', mat4.multiplyVec4(vMat, [5.0, 10.0, 0.0, 1.0]))
            prg.setUniform3f('LightIntensity', 0.5, 0.5, 0.5)

            prg.setUniform3f('Kd', 0.9, 0.9, 0.9)
            prg.setUniform3f('Ks', 0.9, 0.9, 0.9)
            prg.setUniform3f('Ka', 0.4, 0.4, 0.4)
            prg.setUniform1f('Shininess', 10.0)

            update = function(dt){
                mat4.identity(mMat)
                //mat4.scale(mMat, [0.5, 0.5, 0.5])
                mat4.translate(mMat, [0.0, 0.0, 0.0])
                mat4.rotate(mMat, Date.now() * 0.05 * Math.PI / 180, [1, 0.8, 0.9])

                var mvMat = mat4.multiply(vMat, mMat, [])
                prg.setUniformMat4('MVMatrix', mvMat)
                prg.setUniformMat3('NormalMatrix', mat4.toMat3(mvMat, []))
                prg.setUniformMat4('MVP', mat4.multiply(pMat, mvMat, []))
                vaoTorus.render()
            }
        })
    })

    addScene('scene4', function(){
        GLProg.asyncReady('texture.vs.txt', 'texture.fs.txt',
            ['VertexPos', 'Normal', 'TexCoord'], function(prg){
            prg.use()

            $('#control-panel').append($('<p>A/S: rotate</p>'))

            var tex = gl.createTexture()
            var imgData = new Image()
            imgData.onload = function(){
                gl.activeTexture(gl.TEXTURE0)

                gl.bindTexture(gl.TEXTURE_2D, tex)
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imgData)
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)

                prg.setUniform1i('uTex', 0)

                //gl.bindTexture(gl.TEXTURE_2D, null)
            }
            imgData.src = 'brick1.jpg'

            var vaoCube = new VAOCube()

            var pMat = mat4.perspective(70, canvas.width / canvas.height, 0.3, 100.0, [])
            var vMat = mat4.lookAt([0.0, 2.0, 2.0], [0.0, 0.0, 0.0], [0.0, 1.0, 0.0])
            var mMat = mat4.create()

            prg.setUniformVec4('LightPos', mat4.multiplyVec4(vMat, [5.0, 10.0, 0.0, 1.0]))
            prg.setUniform3f('LightIntensity', 0.5, 0.5, 0.5)

            prg.setUniform3f('Kd', 0.9, 0.9, 0.9)
            prg.setUniform3f('Ks', 0.9, 0.9, 0.9)
            prg.setUniform3f('Ka', 0.4, 0.4, 0.4)
            prg.setUniform1f('Shininess', 10.0)

            //gl.disable(gl.DEPTH_TEST)
            //gl.enable(gl.BLEND)
            //gl.blendFunc(gl.SRC_ALPHA, gl.ONE)

            var rotX = 0, rotY = 0
            update = function(dt){
                if(keyState['A'.charCodeAt()]) rotX += 0.5
                if(keyState['S'.charCodeAt()]) rotY += 0.5

                mat4.identity(mMat)
                mat4.translate(mMat, [0.0, 0.0, 0.0])
                mat4.rotateX(mMat, rotX * Math.PI / 180)
                mat4.rotateY(mMat, rotY * Math.PI / 180)
                //mat4.rotate(mMat, Date.now() * 0.05 * Math.PI / 180, [1, 0.8, 0.9])

                var mvMat = mat4.multiply(vMat, mMat, [])
                prg.setUniformMat4('MVMatrix', mvMat)
                prg.setUniformMat3('NormalMatrix', mat4.toMat3(mvMat, []))
                prg.setUniformMat4('MVP', mat4.multiply(pMat, mvMat, []))
                vaoCube.render()
            }
        })
    })

    /*
    addScene('scene5', function(){
        GLProg.asyncReady('colorTex.vs.txt', 'colorTex.fs.txt',
            ['aVertexPos', 'aTexCoord'], function(prg){
            prg.use()

            gl.blendFunc(gl.SRC_ALPHA, gl.ONE)
            gl.enable(gl.BLEND)

            var mvMat = mat4.create()
            var mvMatStack = []
            function mvPushMatrix(){
                var copy = mat4.create()
                mat4.set(mvMat, copy)
                mvMatStack.push(copy)
            }

            function mvPopMatrix(){
                mvMat = mvMatStack.pop()
            }

            var tex = gl.createTexture()
            var imgData = new Image()
            imgData.onload = function(){
                gl.activeTexture(gl.TEXTURE0)

                gl.bindTexture(gl.TEXTURE_2D, tex)
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imgData)
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)

                prg.setUniform1i('uSampler', 0)

                //gl.bindTexture(gl.TEXTURE_2D, null)
            }
            imgData.src = 'star.gif'

            function Star(startingDist, rotSpeed){
                this.angle = 0
                this.dist = startingDist;
                this.rotSpeed = rotSpeed;

                // set random color
            }
            Star.prototype = {
                draw:function(tilt, spin, twinkle){
                    mvPushMatrix()

                    //mat4.rotate(mvMat, degToRad(this.angle), [0.0, 1.0, 0.0])
                    //mat4.translate(mvMat, [this.dist, 0.0, 0.0])
                    //mat4.rotate(mvMat, degToRad(-this.angle), [0.0, 1.0, 0.0])
                    //mat4.rotate(mvMat, degToRad(-tilt), [1.0, 0.0, 0.0])

                    mvPopMatrix()
                }
            }

            var tilt = 0.5
            var spin = 0
            var stars = []
            var starNum = 50
            for(var i = 0; i < starNum; ++i){
                stars.push(new Star((i / starNum) * 5.0, i / starNum))
            }

            var vaoSquare = new VAOSquare()
            mat4.identity(mvMat)
            mat4.scale(mvMat, [0.5, 0.5, 1.0])
            mat4.translate(mvMat, [0.0, 0.0, -1.0])
            //mat4.rotate(mvMat, degToRad(tilt), [1.0, 0.0, 0.0])
            update = function(dt){
                prg.setUniformMat4('uMV', mvMat)

                for(var idx in stars){
                    stars[idx].draw(tilt, spin, false)
                    spin += 0.1

                    vaoSquare.render()
                }
            }
        })
    })
    */
})
